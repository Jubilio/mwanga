const { db } = require('../config/db');
const logger = require('../utils/logger');

// A write sent twice with the same Idempotency-Key is saved once. The second call
// gets the first answer back. The app sends one key per action, so a retry after a
// lost response, or an offline queue replayed later, never creates a second movement.

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
const KEEP_DAYS = 14;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function initIdempotencySchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS idempotency_keys (
      household_id INTEGER NOT NULL,
      idem_key TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER,
      response JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (household_id, idem_key)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys (created_at)',
    'ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY',
  ];
  try {
    for (const sql of statements) await db.execute({ sql, args: [] });
    logger.info('idempotency_keys table initialized or already exists.');
  } catch (error) {
    logger.warn(`Failed to initialize idempotency_keys table: ${error.message}`);
  }
}

let lastCleanup = 0;
function cleanupOldKeys() {
  const now = Date.now();
  if (now - lastCleanup < 6 * 60 * 60 * 1000) return;
  lastCleanup = now;
  db.execute({
    sql: `DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '${KEEP_DAYS} days'`,
    args: [],
  }).catch(() => {});
}

function idempotency() {
  return async (req, res, next) => {
    const key = req.get('Idempotency-Key');
    const householdId = req.user?.householdId;
    if (!key || !WRITE_METHODS.has(req.method) || !householdId) return next();
    if (!KEY_PATTERN.test(key)) {
      return res.status(400).json({ error: 'Idempotency-Key inválida' });
    }

    const path = req.originalUrl.split('?')[0];
    let claimed;
    try {
      claimed = await db.execute({
        sql: `INSERT INTO idempotency_keys (household_id, idem_key, method, path)
              VALUES (?, ?, ?, ?) ON CONFLICT (household_id, idem_key) DO NOTHING RETURNING idem_key`,
        args: [householdId, key, req.method, path],
      });
    } catch (error) {
      // Without the table the write cannot be protected. Refuse it rather than risk a
      // duplicate: the app keeps the action queued and tries again later.
      logger.error(`Idempotency check failed: ${error.message}`);
      return res.status(503).json({ error: 'Serviço temporariamente indisponível' });
    }

    if (claimed.rowCount === 0) {
      const existing = await db.execute({
        sql: `SELECT method, path, status_code, response,
                     created_at < NOW() - INTERVAL '10 minutes' AS stale
              FROM idempotency_keys WHERE household_id = ? AND idem_key = ?`,
        args: [householdId, key],
      }).catch(() => ({ rows: [] }));
      const row = existing.rows[0];
      if (row && (row.method !== req.method || row.path !== path)) {
        return res.status(422).json({ error: 'Idempotency-Key já usada noutro pedido' });
      }
      if (row && row.status_code) {
        res.set('Idempotent-Replayed', 'true');
        return res.status(row.status_code).json(row.response ?? { success: true });
      }
      if (row && row.stale) {
        // The first attempt never finished (the server restarted mid-request). Its
        // writes run in one transaction, so nothing was half saved: let this one run.
        await db.execute({
          sql: 'DELETE FROM idempotency_keys WHERE household_id = ? AND idem_key = ? AND status_code IS NULL',
          args: [householdId, key],
        }).catch(() => {});
      }
      return res.status(409).json({ error: 'Pedido igual ainda em processamento', retryable: true });
    }

    cleanupOldKeys();

    const originalJson = res.json.bind(res);
    let body;
    res.json = (payload) => { body = payload; return originalJson(payload); };

    res.on('finish', () => {
      const ok = res.statusCode >= 200 && res.statusCode < 300;
      const query = ok
        ? { sql: 'UPDATE idempotency_keys SET status_code = ?, response = ? WHERE household_id = ? AND idem_key = ?',
            args: [res.statusCode, JSON.stringify(body ?? null), householdId, key] }
        // A failed write did not happen, so the same key may be tried again.
        : { sql: 'DELETE FROM idempotency_keys WHERE household_id = ? AND idem_key = ?', args: [householdId, key] };
      db.execute(query).catch((error) => logger.warn(`Idempotency save failed: ${error.message}`));
    });

    next();
  };
}

module.exports = { idempotency, initIdempotencySchema, KEY_PATTERN };
