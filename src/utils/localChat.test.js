// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tables = ['mensagens', 'transacoes', 'budgets', 'metas', 'rendas', 'patrimonio', 'dividas', 'settings', 'pendingActions'];
const db = Object.fromEntries(tables.map((name) => [name, { clear: vi.fn().mockResolvedValue() }]));
vi.mock('../db/db', () => ({ db }));
vi.mock('./authToken', () => ({ tokenUserId: vi.fn(() => '7') }));

const { clearLocalUserData, ensureChatOwner } = await import('./localChat');

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

describe('local Binth conversation', () => {
  it('clears the conversation when someone else signs in on the device', async () => {
    await ensureChatOwner('7');
    expect(db.mensagens.clear).not.toHaveBeenCalled();
    await ensureChatOwner('8');
    expect(db.mensagens.clear).toHaveBeenCalledTimes(1);
    await ensureChatOwner('8');
    expect(db.mensagens.clear).toHaveBeenCalledTimes(1);
  });

  it('logout removes the conversation and cached records but keeps unsynced actions', async () => {
    await ensureChatOwner('7');
    await clearLocalUserData();
    expect(db.mensagens.clear).toHaveBeenCalled();
    expect(db.transacoes.clear).toHaveBeenCalled();
    expect(db.pendingActions.clear).not.toHaveBeenCalled();
    expect(localStorage.getItem('mwanga-chat-owner')).toBeNull();
  });
});
