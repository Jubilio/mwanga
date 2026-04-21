import Dexie from 'dexie';

export const db = new Dexie('MwangaDB');

// Definir o esquema da base de dados local
db.version(3).stores({
  transacoes: '++id, data, tipo, cat, account_id',
  budgets: '++id, category',
  metas: '++id, nome, prazo',
  rendas: '++id, mes, landlord',
  settings: 'id', 
  patrimonio: '++id, nome, tipo',
  dividas: '++id, creditor_name, status',
  mensagens: '++id, role, content, timestamp',
  pendingActions: '++id, type, timestamp' // Fila de sincronização offline
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
    if (state.transacoes?.length > 0) {
      const tCount = await db.transacoes.count();
      if (tCount === 0) await db.transacoes.bulkAdd(state.transacoes);
    }
    
    if (state.budgets?.length > 0) {
      const bCount = await db.budgets.count();
      if (bCount === 0) await db.budgets.bulkAdd(state.budgets);
    }

    if (state.dividas?.length > 0) {
      const dCount = await db.dividas.count();
      if (dCount === 0) await db.dividas.bulkAdd(state.dividas);
    }
  } catch (error) {
    console.error('Dexie Init Error:', error);
  }
}
