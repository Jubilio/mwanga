export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff&size=128';
const bool = (value, fallback = true) => value === undefined ? fallback : value === true || value === 'true' || value === '1';
export function settingsForm(state) {
  const s = state.settings || {};
  return {
    user_name: state.user?.name ?? '', whatsapp_number: state.user?.whatsapp_number ?? '',
    household_name: s.household_name ?? '', cash_balance: s.cash_balance ?? 0,
    user_salary: s.user_salary ?? 0, default_rent: s.default_rent ?? 0, landlord_name: s.landlord_name ?? '',
    currency: s.currency ?? 'MT', financial_month_start_day: s.financial_month_start_day ?? s.cycle_start ?? 25,
    profile_pic: s.profile_pic || DEFAULT_AVATAR,
    daily_entry_reminder_enabled: bool(s.daily_entry_reminder_enabled), daily_entry_reminder_time: s.daily_entry_reminder_time || '20:00',
    monthly_due_reminder_enabled: bool(s.monthly_due_reminder_enabled), monthly_due_reminder_time: s.monthly_due_reminder_time || '08:00',
    monthly_due_reminder_period: s.monthly_due_reminder_period || 'inicio', debt_due_reminder_enabled: bool(s.debt_due_reminder_enabled),
    sms_automation_enabled: bool(s.sms_automation_enabled, false),
    default_income_account_id: s.default_income_account_id || '', default_expense_account_id: s.default_expense_account_id || '',
  };
}
export function changedSettings(form, base) {
  return Object.keys(base).filter(key => String(form[key]) !== String(base[key]));
}
export function validateSettings(form, accounts = []) {
  if (form.user_name.trim().length < 2 || form.user_name.trim().length > 100) return 'invalid_name';
  if (!form.household_name.trim() || form.household_name.trim().length > 100) return 'invalid_household';
  for (const key of ['user_salary', 'default_rent', 'cash_balance']) {
    if (String(form[key]).trim() === '' || !Number.isFinite(Number(form[key])) || Number(form[key]) < 0 || Number(form[key]) > 1e12) return 'invalid_amount';
  }
  const cycle = Number(form.financial_month_start_day);
  if (!Number.isInteger(cycle) || cycle < 1 || cycle > 31) return 'invalid_cycle';
  if (!['MT', 'USD', 'EUR', 'ZAR'].includes(form.currency)) return 'invalid_currency';
  if (form.whatsapp_number && !/^\+?\d{8,15}$/.test(form.whatsapp_number.trim())) return 'invalid_whatsapp';
  for (const key of ['daily_entry_reminder_time', 'monthly_due_reminder_time']) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form[key])) return 'invalid_time';
  }
  for (const key of ['default_income_account_id', 'default_expense_account_id']) {
    if (form[key] && !accounts.some(account => String(account.id) === String(form[key]))) return 'invalid_account';
  }
  return null;
}
export function settingsActions(form, base) {
  const changed = new Set(changedSettings(form, base));
  const actions = [];
  const user = {};
  if (changed.has('user_name')) user.name = form.user_name.trim();
  if (changed.has('whatsapp_number')) user.whatsapp_number = form.whatsapp_number.trim().replace(/\D/g, '');
  if (Object.keys(user).length) actions.push({ type: 'UPDATE_USER', payload: user });
  const household = {};
  if (changed.has('household_name')) household.name = form.household_name.trim();
  if (changed.has('cash_balance')) household.cash_balance = Number(form.cash_balance);
  if (Object.keys(household).length) actions.push({ type: 'UPDATE_HOUSEHOLD', payload: household });
  for (const key of changed) {
    if (['user_name', 'whatsapp_number', 'household_name', 'cash_balance'].includes(key)) continue;
    actions.push({ type: 'UPDATE_SETTING', payload: { key, value: ['user_salary', 'default_rent', 'financial_month_start_day'].includes(key) ? Number(form[key]) : form[key] } });
  }
  return actions;
}
