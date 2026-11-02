const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');
const logger = require('../utils/logger');
const redis = require('../utils/redis');

// Apaga a conta e os dados pessoais do utilizador (pedido da Google Play e
// da protecção de dados). O esquema da base de dados foi criado à mão no
// Supabase ao longo do tempo, por isso as tabelas a limpar são descobertas
// no próprio PostgreSQL em vez de uma lista fixa que ficaria desactualizada:
//   * colunas user_id                → linhas do utilizador
//   * colunas household_id/tenant_id → linhas da família, só quando ninguém
//                                      mais pertence a ela
//   * chaves estrangeiras para users/households (ex.: created_by)
// Chaves com ON DELETE CASCADE / SET NULL ficam a cargo do PostgreSQL.

const USER_COLUMNS = ['user_id'];
const HOUSEHOLD_COLUMNS = ['household_id', 'tenant_id'];
const DB_HANDLED = ['c', 'n', 'd']; // cascade, set null, set default
const MAX_PASSES = 8;
const MAX_CHILD_DEPTH = 3;

const REFERENCES_SQL = `
  SELECT c.table_name, c.column_name, NULL::text AS ref_table, NULL::text AS on_delete
  FROM information_schema.columns c
  JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    AND c.column_name = ANY($1::text[])
  UNION ALL
  SELECT cl.relname, a.attname, rt.relname, con.confdeltype::text
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = cl.relnamespace
  JOIN pg_class rt ON rt.oid = con.confrelid
  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
  WHERE con.contype = 'f' AND n.nspname = 'public'
    AND rt.relname IN ('users', 'households') AND array_length(con.conkey, 1) = 1
`;

// Todas as chaves estrangeiras simples do esquema public, para apagar também
// as linhas-filhas (ex.: loan_payments de um empréstimo) que não têm user_id.
const FOREIGN_KEYS_SQL = `
  SELECT cl.relname AS child_table, a.attname AS child_column,
         rt.relname AS parent_table, ra.attname AS parent_column, con.confdeltype::text AS on_delete
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = cl.relnamespace
  JOIN pg_class rt ON rt.oid = con.confrelid
  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
  JOIN pg_attribute ra ON ra.attrelid = con.confrelid AND ra.attnum = con.confkey[1]
  WHERE con.contype = 'f' AND n.nspname = 'public' AND array_length(con.conkey, 1) = 1
`;

/**
 * Transforma as referências encontradas na lista de DELETEs a fazer.
 * Função pura para poder ser testada sem base de dados.
 */
function buildDeletionPlan(references, { userId, householdId, deleteHousehold }) {
  const byColumn = new Map();
  for (const ref of references) {
    const key = `${ref.table_name}.${ref.column_name}`;
    const entry = byColumn.get(key) || { table: ref.table_name, column: ref.column_name, fk: null };
    if (ref.ref_table) entry.fk = { refTable: ref.ref_table, onDelete: ref.on_delete };
    byColumn.set(key, entry);
  }

  const plan = [];
  for (const { table, column, fk } of byColumn.values()) {
    if (table === 'users' || table === 'households') continue;
    if (fk && DB_HANDLED.includes(fk.onDelete)) continue;

    const target = fk?.refTable
      || (USER_COLUMNS.includes(column) ? 'users' : HOUSEHOLD_COLUMNS.includes(column) ? 'households' : null);
    if (target === 'users') plan.push({ table, column, value: userId });
    else if (target === 'households' && deleteHousehold && householdId) plan.push({ table, column, value: householdId });
  }
  return plan;
}

/**
 * Acrescenta as linhas-filhas cujas chaves estrangeiras bloqueariam os DELETEs
 * (sem ON DELETE CASCADE), até MAX_CHILD_DEPTH níveis.
 */
function addChildSteps(plan, foreignKeys) {
  const all = [...plan];
  let frontier = plan;
  for (let depth = 0; depth < MAX_CHILD_DEPTH && frontier.length; depth += 1) {
    const next = [];
    for (const parent of frontier) {
      for (const fk of foreignKeys) {
        if (fk.parent_table !== parent.table || DB_HANDLED.includes(fk.on_delete)) continue;
        if (fk.child_table === 'users' || fk.child_table === 'households') continue;
        if (fk.child_table === parent.table) continue; // auto-referência: o DELETE da própria tabela trata
        next.push({ table: fk.child_table, column: fk.child_column, parent, parentColumn: fk.parent_column });
      }
    }
    all.push(...next);
    frontier = next;
  }
  return all;
}

/** WHERE de um passo: valor directo, ou "filhos de" um passo-pai. */
function whereFor(step) {
  if (!step.parent) return { sql: `${quote(step.column)} = ?`, args: [step.value] };
  const inner = whereFor(step.parent);
  return {
    sql: `${quote(step.column)} IN (SELECT ${quote(step.parentColumn)} FROM public.${quote(step.parent.table)} WHERE ${inner.sql})`,
    args: inner.args,
  };
}

const quote = (name) => `"${String(name).replace(/"/g, '""')}"`;

/**
 * Executa os DELETEs dentro da transacção. Como não se conhece a ordem das
 * chaves estrangeiras, um DELETE bloqueado por outra tabela (erro 23503) é
 * desfeito com um SAVEPOINT e tentado de novo na volta seguinte.
 */
async function runPlan(tx, plan) {
  let pending = plan;
  for (let pass = 0; pass < MAX_PASSES && pending.length; pass += 1) {
    const blocked = [];
    for (const step of pending) {
      await tx.execute({ sql: 'SAVEPOINT account_delete_step' });
      try {
        const where = whereFor(step);
        await tx.execute({ sql: `DELETE FROM public.${quote(step.table)} WHERE ${where.sql}`, args: where.args });
        await tx.execute({ sql: 'RELEASE SAVEPOINT account_delete_step' });
      } catch (error) {
        await tx.execute({ sql: 'ROLLBACK TO SAVEPOINT account_delete_step' });
        if (error.code !== '23503') throw error;
        blocked.push(step);
      }
    }
    if (blocked.length === pending.length) break;
    pending = blocked;
  }
  if (pending.length) {
    throw new Error(`Não foi possível apagar: ${pending.map((s) => `${s.table}.${s.column}`).join(', ')}`);
  }
}

function removeLegacyFiles(userId) {
  const root = path.join(__dirname, '../../uploads');
  const prefixes = { kyc: `${userId}-`, credit: `${userId}-`, feedback: `feedback-${userId}-` };
  for (const [category, prefix] of Object.entries(prefixes)) {
    const dir = path.join(root, category);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(prefix)) fs.rmSync(path.join(dir, name), { force: true });
    }
  }
}

async function deleteAccount(userId) {
  const summary = await db.withTransaction(async (tx) => {
    const userResult = await tx.execute({ sql: 'SELECT id, household_id FROM users WHERE id = ?', args: [userId] });
    const user = userResult.rows[0];
    if (!user) throw new Error('NOT_FOUND');

    const householdId = user.household_id ? Number(user.household_id) : null;
    let deleteHousehold = false;
    if (householdId) {
      const others = await tx.execute({
        sql: 'SELECT COUNT(*)::int AS count FROM users WHERE household_id = ? AND id <> ?',
        args: [householdId, userId],
      });
      deleteHousehold = Number(others.rows[0]?.count || 0) === 0;
    }

    const refs = await tx.execute({ sql: REFERENCES_SQL, args: [[...USER_COLUMNS, ...HOUSEHOLD_COLUMNS]] });
    const fks = await tx.execute({ sql: FOREIGN_KEYS_SQL });
    const plan = buildDeletionPlan(refs.rows, { userId, householdId, deleteHousehold });
    await runPlan(tx, addChildSteps(plan, fks.rows).reverse());

    await tx.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [userId] });
    if (deleteHousehold) await tx.execute({ sql: 'DELETE FROM households WHERE id = ?', args: [householdId] });

    return { householdDeleted: deleteHousehold, tables: plan.length };
  });

  try { removeLegacyFiles(userId); } catch (error) { logger.warn(`Ficheiros antigos do utilizador ${userId} não apagados: ${error.message}`); }
  if (redis) {
    try { await redis.del(`score:${userId}`, `risk_velocity:${userId}`); } catch (error) { logger.warn(`Cache do utilizador ${userId} não apagada: ${error.message}`); }
  }

  logger.info(`Conta ${userId} apagada (${summary.tables} tabelas, família apagada: ${summary.householdDeleted}).`);
  return summary;
}

module.exports = { deleteAccount, buildDeletionPlan, addChildSteps, whereFor, runPlan };
