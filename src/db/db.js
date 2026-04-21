import Dexie from 'dexie';

export const db = new Dexie('MwangaDB');

// Definir o esquema da base de dados local
db.version(2).stores({
  transacoes: '++id, data, tipo, cat, account_id',
  budgets: '++id, category',
  metas: '++id, nome, prazo',
  rendas: '++id, mes, landlord',
  settings: 'id', 
  patrimonio: '++id, nome, tipo',
  mensagens: '++id, role, content, timestamp'
});

// Lidar com atualizações de versão entre diferentes separadores do browser
db.on('versionchange', () => {
  db.close();
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
});

// Helper para inicializar dados se necessário
export async function initializeOfflineData(state) {
  try {
    // Sincronizar estado inicial com Dexie se as tabelas estiverem vazias
    const tCount = await db.transacoes.count();
    if (tCount === 0 && state.transacoes.length > 0) {
      await db.transacoes.bulkAdd(state.transacoes);
    }
    
    const bCount = await db.budgets.count();
    if (bCount === 0 && state.budgets.length > 0) {
      await db.budgets.bulkAdd(state.budgets);
    }
  } catch (error) {
    console.error('Dexie Init Error:', error);
  }
}
