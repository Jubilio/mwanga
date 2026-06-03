require('dotenv').config();
const { pool, initDb } = require('../src/config/db');

async function cleanupAccounts() {
  await initDb();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const all = await client.query(`SELECT id, name, type, current_balance FROM accounts ORDER BY name`);
    console.log('\n=== CONTAS ANTES ===');
    all.rows.forEach(r => console.log(`[${r.id}] "${r.name}" | tipo: ${r.type} | saldo: ${r.current_balance}`));

    // 1. Fundir todos os Millennium BIM (inclui "Bim" banco com saldo 0)
    const bimAccounts = all.rows.filter(r =>
      r.name.toLowerCase().includes('bim') ||
      r.name.toLowerCase().includes('millennium')
    );
    if (bimAccounts.length >= 2) {
      bimAccounts.sort((a, b) => Math.abs(Number(b.current_balance)) - Math.abs(Number(a.current_balance)));
      const primary = bimAccounts[0];
      const secondaries = bimAccounts.slice(1);
      let merged = Number(primary.current_balance);
      for (const sec of secondaries) {
        merged += Number(sec.current_balance);
        const tx = await client.query(`UPDATE transactions SET account_id = $1 WHERE account_id = $2 RETURNING id`, [primary.id, sec.id]);
        console.log(`Migradas ${tx.rowCount} transações de [${sec.id}]"${sec.name}" -> primária`);
        await client.query(`DELETE FROM accounts WHERE id = $1`, [sec.id]);
        console.log(`Eliminada conta [${sec.id}] "${sec.name}"`);
      }
      await client.query(
        `UPDATE accounts SET name = 'Millennium BIM', type = 'banco', current_balance = $1 WHERE id = $2`,
        [merged, primary.id]
      );
      console.log(`\nMillennium BIM unificada: saldo final = ${merged} MT`);
    }

    // 2. Corrigir tipo "outro" para "mobile" em contas de carteira
    const mobileFix = await client.query(`
      UPDATE accounts 
      SET type = 'mobile' 
      WHERE (name ILIKE '%m-pesa%' OR name ILIKE '%mpesa%' OR name ILIKE '%e-mola%' OR name ILIKE '%emola%' OR name ILIKE '%mkesh%')
        AND type != 'mobile'
      RETURNING id, name
    `);
    if (mobileFix.rowCount > 0) {
      console.log('\nCorrigidos para mobile:', mobileFix.rows.map(r => r.name));
    }

    const result = await client.query(`SELECT id, name, type, current_balance FROM accounts ORDER BY name`);
    console.log('\n=== CONTAS FINAIS ===');
    result.rows.forEach(r => console.log(`[${r.id}] "${r.name}" | tipo: ${r.type} | saldo: ${r.current_balance}`));

    await client.query('COMMIT');
    console.log('\n✅ Limpeza concluída!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

cleanupAccounts();
