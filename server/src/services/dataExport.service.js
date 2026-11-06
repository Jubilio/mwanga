const { db } = require('../config/db');

// "Exportar os meus dados": everything stored about the person and their
// household, as JSON. Like the account deletion, the tables are discovered in
// PostgreSQL (any table with a user_id or household_id column), so a new table
// is exported without code changes.
//
// Secrets are never exported: passwords, reset codes, tokens, encrypted AI keys,
// passkey and push keys.
const MAX_ROWS_PER_TABLE = 20000;
const SKIP_TABLES = new Set(['idempotency_keys', 'binth_daily_usage', 'ai_budget_alerts']);
const SECRET_COLUMN = /password|token|secret|_hash$|^hash$|p256dh|^auth$|credential|public_key|private_key|verifier|^code$|reset_/i;
const SECRET_SETTING = /credential|token|secret|api_?key|ai_key/i;

const TABLES_SQL = `
  SELECT c.table_name, c.column_name
  FROM information_schema.columns c
  JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    AND c.column_name IN ('user_id', 'household_id')
  ORDER BY c.table_name
`;

const quote = name => `"${String(name).replace(/"/g, '""')}"`;

function cleanRow(table, row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (SECRET_COLUMN.test(k)) continue;
    out[k] = v;
  }
  if (table === 'settings' && SECRET_SETTING.test(String(row.key || ''))) out.value = '[not exported]';
  return out;
}

// One query per table, filtered by the person's own ids; household tables use
// household_id even when they also have user_id, so shared household data is
// included and nothing from another household can be.
function buildPlan(columns) {
  const byTable = new Map();
  for (const { table_name: table, column_name: column } of columns) {
    if (SKIP_TABLES.has(table) || table === 'users' || table === 'households') continue;
    const entry = byTable.get(table) || new Set();
    entry.add(column);
    byTable.set(table, entry);
  }
  return [...byTable.entries()].map(([table, cols]) => ({ table, column: cols.has('household_id') ? 'household_id' : 'user_id' }));
}

async function exportUserData(userId) {
  const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [userId] });
  const user = userRes.rows[0];
  if (!user) throw new Error('NOT_FOUND');
  const householdId = user.household_id;
  const householdRes = householdId
    ? await db.execute({ sql: 'SELECT * FROM households WHERE id = ?', args: [householdId] })
    : { rows: [] };

  const columns = (await db.execute({ sql: TABLES_SQL, args: [] })).rows || [];
  const tables = {};
  for (const { table, column } of buildPlan(columns)) {
    const value = column === 'household_id' ? householdId : userId;
    if (value === null || value === undefined) continue;
    const res = await db.execute({
      sql: `SELECT * FROM public.${quote(table)} WHERE ${quote(column)} = ? LIMIT ${MAX_ROWS_PER_TABLE}`,
      args: [value],
    });
    const rows = (res.rows || []).map(r => cleanRow(table, r));
    if (rows.length) tables[table] = rows;
  }

  return {
    exported_at: new Date().toISOString(),
    format: 'mwanga-export-v1',
    note: 'Dados guardados pelo Mwanga sobre ti e a tua família. Palavras-passe, códigos e chaves não são exportados.',
    user: cleanRow('users', user),
    household: householdRes.rows[0] ? cleanRow('households', householdRes.rows[0]) : null,
    tables,
  };
}

module.exports = { exportUserData, buildPlan, cleanRow };
