// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for the Dexie pendingActions table.
const rows = new Map();
let nextId = 1;
const table = {
  add: vi.fn(async (row) => { const id = nextId++; rows.set(id, { ...row, id }); return id; }),
  toArray: vi.fn(async () => [...rows.values()]),
  delete: vi.fn(async (id) => { rows.delete(id); }),
  bulkDelete: vi.fn(async (ids) => { ids.forEach(id => rows.delete(id)); }),
  where: vi.fn((field) => ({
    equals: (value) => {
      const match = () => [...rows.values()].filter(r => r[field] === value);
      return {
        toArray: async () => match(),
        count: async () => match().length,
        delete: async () => { match().forEach(r => rows.delete(r.id)); },
      };
    },
  })),
};
vi.mock('../db/db', () => ({ db: { pendingActions: table } }));

let currentToken = 'token-A';
const users = { 'token-A': '1', 'token-B': '2' };
vi.mock('./authToken', () => ({
  getToken: () => currentToken,
  tokenUserId: (token = currentToken) => users[token] ?? null,
}));

const { saveWrite, enqueueAction, describeRequest, isRetryableError, QUEUEABLE_TYPES } = await import('./offlineQueue');
const { syncPendingActions } = await import('../hooks/useOfflineSync');

const ok = (body = { success: true }) => ({ ok: true, status: 200, json: async () => body });
const fail = (status, body = {}) => ({ ok: false, status, json: async () => body });
const httpError = (status, code) => Object.assign(new Error(`HTTP ${status}`), { status, code });

beforeEach(() => {
  rows.clear();
  nextId = 1;
  currentToken = 'token-A';
  vi.clearAllMocks();
});

describe('describeRequest', () => {
  it('knows how to send every action type the app can queue', () => {
    const samples = { DELETE_TRANSACTION: 5, DELETE_XITIQUE: 3 };
    for (const type of QUEUEABLE_TYPES) {
      const req = describeRequest(type, samples[type] ?? { id: 1, debtId: 2, contributionId: 3, receiptId: 4 });
      expect(req, type).toBeTruthy();
      expect(req.endpoint).not.toContain('undefined');
    }
  });

  it('sends a xitique payment to its own endpoint', () => {
    expect(describeRequest('PAY_XITIQUE', { contributionId: 9, date: '2026-11-03', account_id: 4 }))
      .toEqual({ endpoint: 'xitiques/pay/9', method: 'POST', body: { date: '2026-11-03', account_id: 4 } });
  });
});

describe('isRetryableError', () => {
  it('queues only when the server gave no answer or was busy', () => {
    expect(isRetryableError(new TypeError('Network Error'))).toBe(true);
    expect(isRetryableError(httpError(503))).toBe(true);
    expect(isRetryableError(httpError(409))).toBe(true);
    expect(isRetryableError(httpError(409, 'ALREADY_PAID'))).toBe(false);
    expect(isRetryableError(httpError(400))).toBe(false);
    expect(isRetryableError(httpError(404))).toBe(false);
  });
});

describe('saveWrite', () => {
  const base = { type: 'PAY_DEBT', payload: { debtId: 2, amount: 100, payment_date: '2026-11-03' } };

  it('a refresh that fails after a confirmed write does not queue the write again', async () => {
    const apiCall = vi.fn().mockResolvedValue({ success: true });
    const onRefreshFailed = vi.fn();
    const outcome = await saveWrite({ ...base, requestId: 'req-12345678', apiCall, refresh: vi.fn().mockRejectedValue(new Error('timeout')), onRefreshFailed });
    expect(outcome).toBe('saved');
    expect(rows.size).toBe(0);
    expect(onRefreshFailed).toHaveBeenCalled();
    expect(apiCall).toHaveBeenCalledWith('debts/2/pay', 'POST', expect.any(Object), { 'Idempotency-Key': 'req-12345678' });
  });

  it('losing the network queues the write with its owner and request id', async () => {
    const onQueued = vi.fn();
    const outcome = await saveWrite({ ...base, requestId: 'req-offline1', apiCall: vi.fn().mockRejectedValue(new TypeError('Network Error')), onQueued });
    expect(outcome).toBe('queued');
    expect(onQueued).toHaveBeenCalled();
    expect([...rows.values()][0]).toMatchObject({ type: 'PAY_DEBT', owner: '1', requestId: 'req-offline1' });
  });

  it('a server refusal is reported, not queued', async () => {
    await expect(saveWrite({ ...base, apiCall: vi.fn().mockRejectedValue(httpError(400)) })).rejects.toThrow('HTTP 400');
    expect(rows.size).toBe(0);
  });

  it('an already settled payment is reported as already done', async () => {
    const outcome = await saveWrite({ ...base, apiCall: vi.fn().mockRejectedValue(httpError(409, 'ALREADY_PAID')), refresh: vi.fn() });
    expect(outcome).toBe('already_done');
    expect(rows.size).toBe(0);
  });
});

describe('syncPendingActions', () => {
  it('never sends one person\'s queued action with another person\'s session', async () => {
    await enqueueAction('ADD_TRANSACTION', { amount: 50 }, 'req-userA-0001', '1');
    currentToken = 'token-B';
    await enqueueAction('ADD_TRANSACTION', { amount: 70 }, 'req-userB-0001', '2');

    const fetchImpl = vi.fn().mockResolvedValue(ok());
    const result = await syncPendingActions({ apiUrl: 'https://api', fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer token-B');
    expect(JSON.parse(init.body)).toEqual({ amount: 70 });
    expect(result.sent).toBe(1);
    // A's action is still waiting for A.
    expect([...rows.values()].map(r => r.owner)).toEqual(['1']);
  });

  it('sends a queued xitique payment and removes it only after the server confirms', async () => {
    await enqueueAction('PAY_XITIQUE', { contributionId: 9, date: '2026-11-03', account_id: null }, 'req-xitique01', '1');
    const fetchImpl = vi.fn().mockResolvedValue(ok());
    await syncPendingActions({ apiUrl: 'https://api', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith('https://api/xitiques/pay/9', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': 'req-xitique01' }),
    }));
    expect(rows.size).toBe(0);
  });

  it('keeps the queue when the network drops or the server is busy', async () => {
    await enqueueAction('PAY_XITIQUE', { contributionId: 9, date: '2026-11-03' }, 'req-keep00001', '1');
    await syncPendingActions({ apiUrl: 'https://api', fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });
    expect(rows.size).toBe(1);
    await syncPendingActions({ apiUrl: 'https://api', fetchImpl: vi.fn().mockResolvedValue(fail(503)) });
    expect(rows.size).toBe(1);
    await syncPendingActions({ apiUrl: 'https://api', fetchImpl: vi.fn().mockResolvedValue(fail(409, { retryable: true })) });
    expect(rows.size).toBe(1);
  });

  it('replaying the same action twice sends the same key, so the server saves it once', async () => {
    await enqueueAction('ADD_TRANSACTION', { amount: 10 }, 'req-replay001', '1');
    const first = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await syncPendingActions({ apiUrl: 'https://api', fetchImpl: first });
    const second = vi.fn().mockResolvedValue(ok());
    await syncPendingActions({ apiUrl: 'https://api', fetchImpl: second });
    expect(first.mock.calls[0][1].headers['Idempotency-Key']).toBe('req-replay001');
    expect(second.mock.calls[0][1].headers['Idempotency-Key']).toBe('req-replay001');
  });

  it('drops actions the server refuses or already recorded', async () => {
    await enqueueAction('PAY_DEBT', { debtId: 1, amount: 5 }, 'req-paid00001', '1');
    await enqueueAction('ADD_TRANSACTION', { amount: -1 }, 'req-bad000001', '1');
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(fail(409, { code: 'ALREADY_PAID' }))
      .mockResolvedValueOnce(fail(400));
    const result = await syncPendingActions({ apiUrl: 'https://api', fetchImpl });
    expect(rows.size).toBe(0);
    expect(result).toMatchObject({ sent: 1, dropped: 1 });
  });

  it('drops queued actions that have no owner instead of sending them', async () => {
    rows.set(99, { id: 99, type: 'ADD_TRANSACTION', payload: { amount: 1 }, timestamp: 1 });
    const fetchImpl = vi.fn().mockResolvedValue(ok());
    await syncPendingActions({ apiUrl: 'https://api', fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rows.size).toBe(0);
  });

  it('stops when the session changes in the middle of a sync', async () => {
    await enqueueAction('ADD_TRANSACTION', { amount: 1 }, 'req-switch001', '1');
    await enqueueAction('ADD_TRANSACTION', { amount: 2 }, 'req-switch002', '1');
    const fetchImpl = vi.fn(async () => { currentToken = 'token-B'; return ok(); });
    const result = await syncPendingActions({ apiUrl: 'https://api', token: 'token-A', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.stopped).toBe('session_changed');
    expect(rows.size).toBe(1);
  });
});
