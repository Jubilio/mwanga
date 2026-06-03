require('dotenv').config();
const { pool, initDb } = require('../src/config/db');

async function mergeAccounts() {
  await initDb();
  
  console.log("Iniciando processo de fusão de contas BIM...");
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Encontrar as contas que contêm "BIM"
    const accountsResult = await client.query(`SELECT * FROM accounts WHERE name ILIKE '%BIM%'`);
    const accounts = accountsResult.rows;
    
    if (accounts.length < 2) {
      console.log("Não foram encontradas contas suficientes para fundir. Contas encontradas:", accounts.map(a => a.name));
      process.exit(0);
    }
    
    // 2. Identificar a principal e a secundária
    let primary = accounts.find(a => a.name.toLowerCase().includes('millennium'));
    let secondary = accounts.find(a => a.name.toLowerCase() === 'bim');
    
    if (!primary || !secondary) {
      // Fallback
      primary = accounts.reduce((prev, curr) => (prev.id < curr.id ? prev : curr)); // Mais antiga
      secondary = accounts.find(a => a.id !== primary.id);
    }
    
    console.log(`Conta Primária a manter: [${primary.id}] ${primary.name} (Saldo: ${primary.current_balance})`);
    console.log(`Conta Secundária a fundir: [${secondary.id}] ${secondary.name} (Saldo: ${secondary.current_balance})`);
    
    // 3. Atualizar Transações
    const txResult = await client.query(
      `UPDATE transactions SET account_id = $1 WHERE account_id = $2 RETURNING id`,
      [primary.id, secondary.id]
    );
    console.log(`Foram migradas ${txResult.rowCount} transações.`);
    
    // 4. Fundir os saldos
    // Opção escolhida no plano: O Saldo final deve ser a soma das duas.
    const newBalance = Number(primary.current_balance) + Number(secondary.current_balance);
    
    await client.query(
      `UPDATE accounts SET current_balance = $1, name = 'Millennium BIM' WHERE id = $2`,
      [newBalance, primary.id]
    );
    console.log(`Saldo atualizado na conta primária para: ${newBalance}`);
    
    // 6. Apagar a conta secundária
    await client.query(`DELETE FROM accounts WHERE id = $1`, [secondary.id]);
    console.log(`Conta secundária [${secondary.id}] apagada com sucesso.`);
    
    await client.query('COMMIT');
    console.log("Fusão concluída com sucesso!");
    
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro durante a fusão:", error);
    process.exit(1);
  } finally {
    client.release();
  }
}

mergeAccounts();
