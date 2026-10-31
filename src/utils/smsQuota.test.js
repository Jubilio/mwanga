import { describe, expect, it } from 'vitest';
import { countSmsThisMonth, getSmsQuota, isSmsTransaction } from './smsQuota';
import { hasFeatureAccess } from '../config/features';

const now = new Date('2026-10-31T12:00:00Z');
const sms = (data, nota = 'Banco: M-Pesa | Confiança: 90% | SMS: Confirmado...') => ({ data, nota });

describe('sms quota', () => {
  it('opens SMS import to the free plan', () => {
    expect(hasFeatureAccess('free', 'sms-import')).toBe(true);
    expect(hasFeatureAccess('pro', 'sms-import')).toBe(true);
  });

  it('recognises both import paths and ignores ordinary notes', () => {
    expect(isSmsTransaction(sms('2026-10-01'))).toBe(true);
    expect(isSmsTransaction({ note: 'SMS_REF:123 | TX:ABC' })).toBe(true);
    expect(isSmsTransaction({ nota: 'Paguei o SMS do amigo' })).toBe(false);
    expect(isSmsTransaction({ nota: null })).toBe(false);
  });

  it('counts only this month', () => {
    const list = [sms('2026-10-01'), sms('2026-10-30'), sms('2026-09-30'), { data: '2026-10-05', nota: 'Pão' }];
    expect(countSmsThisMonth(list, now)).toBe(2);
  });

  it('caps the free plan at 30 a month and leaves paid plans unlimited', () => {
    const list = Array.from({ length: 29 }, () => sms('2026-10-10'));
    expect(getSmsQuota('free', list, now)).toMatchObject({ limited: true, used: 29, remaining: 1, limit: 30 });
    expect(getSmsQuota('free', list, now, 2).remaining).toBe(0);
    expect(getSmsQuota('growth', list, now).limited).toBe(false);
  });
});
