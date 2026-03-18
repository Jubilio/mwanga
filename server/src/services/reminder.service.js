const { db } = require('../config/db');
const { createNotification } = require('./notification.service');

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Maputo';

function formatInTimezone(date = new Date(), options = {}) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...options,
  }).format(date);
}

function formatDateInTimezone(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getNowParts() {
  const stamp = formatInTimezone(new Date()).replace(' ', 'T');
  const [datePart, timePart] = stamp.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  return {
    year,
    month,
    day,
    date: datePart,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

function getTargetMonth(period, parts) {
  let year = parts.year;
  let month = parts.month;

  if (period === 'fim') {
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthWindow(parts, period) {
  const currentMonthDate = new Date(Date.UTC(parts.year, parts.month - 1, 1));
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();

  if (period === 'fim') {
    return {
      startDate: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(Math.max(1, lastDay - 2)).padStart(2, '0')}`,
      endDate: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  return {
    startDate: formatDateInTimezone(currentMonthDate),
    endDate: `${parts.year}-${String(parts.month).padStart(2, '0')}-03`,
  };
}

async function hasNotificationInWindow(householdId, type, startDate, endDate) {
  const result = await db.execute({
    sql: `
      SELECT id
      FROM notifications
      WHERE household_id = ?
        AND type = ?
        AND substr(CAST(created_at AS TEXT), 1, 10) >= ?
        AND substr(CAST(created_at AS TEXT), 1, 10) <= ?
      LIMIT 1
    `,
    args: [householdId, type, startDate, endDate]
  });

  return Boolean(result.rows?.[0]?.id);
}

async function getSettingsMap(householdId) {
  const result = await db.execute({
    sql: 'SELECT key, value FROM settings WHERE household_id = ?',
    args: [householdId]
  });

  return result.rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

async function maybeCreateDailyReminder(householdId, settings, parts) {
  const enabled = parseBoolean(settings.daily_entry_reminder_enabled, true);
  const time = String(settings.daily_entry_reminder_time || '20:00');

  if (!enabled || parts.time < time) {
    return;
  }

  const exists = await hasNotificationInWindow(
    householdId,
    'lembrete-registo',
    parts.date,
    parts.date
  );

  if (exists) {
    return;
  }

  await createNotification(
    householdId,
    'lembrete-registo',
    'Lembrete do dia: regista os teus gastos e entradas de hoje para manter o Mwanga atualizado antes de fechar o dia.'
  );
}

async function maybeCreateMonthlyReminders(householdId, settings, parts) {
  const enabled = parseBoolean(settings.monthly_due_reminder_enabled, true);
  const time = String(settings.monthly_due_reminder_time || '08:00');
  const period = settings.monthly_due_reminder_period === 'fim' ? 'fim' : 'inicio';

  if (!enabled || parts.time < time) {
    return;
  }

  const window = getMonthWindow(parts, period);
  if (parts.date < window.startDate || parts.date > window.endDate) {
    return;
  }

  const targetMonth = getTargetMonth(period, parts);

  const [rentExists, xitiqueExists, debtExists] = await Promise.all([
    hasNotificationInWindow(householdId, 'lembrete-renda', window.startDate, window.endDate),
    hasNotificationInWindow(householdId, 'lembrete-xitique', window.startDate, window.endDate),
    hasNotificationInWindow(householdId, 'lembrete-divida', window.startDate, window.endDate),
  ]);

  const [rentalsRes, settingsRes, xitiqueRes, debtRes] = await Promise.all([
    db.execute({
      sql: `
        SELECT landlord, amount
        FROM rentals
        WHERE household_id = ?
          AND month = ?
          AND status = 'pendente'
        ORDER BY created_at DESC
      `,
      args: [householdId, targetMonth]
    }),
    db.execute({
      sql: 'SELECT key, value FROM settings WHERE household_id = ? AND key IN (?, ?, ?)',
      args: [householdId, 'housing_type', 'default_rent', 'landlord_name']
    }),
    db.execute({
      sql: `
        SELECT x.name, c.amount, cy.due_date
        FROM xitique_contributions c
        JOIN xitique_cycles cy ON cy.id = c.cycle_id
        JOIN xitiques x ON x.id = c.xitique_id
        WHERE x.household_id = ?
          AND x.status = 'active'
          AND c.paid = 0
          AND substr(cy.due_date, 1, 7) = ?
      `,
      args: [householdId, targetMonth]
    }),
    db.execute({
      sql: `
        SELECT creditor_name, remaining_amount, due_date
        FROM debts
        WHERE household_id = ?
          AND status = 'pending'
          AND due_date IS NOT NULL
          AND substr(due_date, 1, 7) = ?
      `,
      args: [householdId, targetMonth]
    }),
  ]);

  const housingSettings = settingsRes.rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  if (!rentExists) {
    const pendingRentals = rentalsRes.rows || [];
    const housingType = housingSettings.housing_type || 'renda';
    const landlordName = housingSettings.landlord_name || 'o senhorio';
    const defaultRent = Number(housingSettings.default_rent || 0);

    if (pendingRentals.length > 0) {
      const total = pendingRentals.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      await createNotification(
        householdId,
        'lembrete-renda',
        `Lembrete mensal: tens ${pendingRentals.length} renda(s) pendente(s) para ${targetMonth}, no total de MT ${total.toFixed(2)}.`
      );
    } else if (housingType === 'renda' && defaultRent > 0) {
      await createNotification(
        householdId,
        'lembrete-renda',
        `Lembrete mensal: confirma o pagamento da renda de ${targetMonth} para ${landlordName} no valor esperado de MT ${defaultRent.toFixed(2)}.`
      );
    }
  }

  if (!xitiqueExists && xitiqueRes.rows.length > 0) {
    const total = xitiqueRes.rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    await createNotification(
      householdId,
      'lembrete-xitique',
      `Lembrete mensal: tens ${xitiqueRes.rows.length} contribuição(ões) de xitique por liquidar em ${targetMonth}, no total de MT ${total.toFixed(2)}.`
    );
  }

  if (!debtExists && debtRes.rows.length > 0) {
    const total = debtRes.rows.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0);
    await createNotification(
      householdId,
      'lembrete-divida',
      `Lembrete mensal: tens ${debtRes.rows.length} dívida(s) com vencimento em ${targetMonth}. Saldo pendente total: MT ${total.toFixed(2)}.`
    );
  }
}

async function ensureReminderNotifications(householdId) {
  const settings = await getSettingsMap(householdId);
  const parts = getNowParts();

  await maybeCreateDailyReminder(householdId, settings, parts);
  await maybeCreateMonthlyReminders(householdId, settings, parts);
}

module.exports = { ensureReminderNotifications };
