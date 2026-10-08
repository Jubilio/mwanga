import { describe, it, expect } from 'vitest';
import { normalizeSettings } from '../services/finance.service';
import { settingsForm, settingsActions, validateSettings } from './settingsForm';
const state = { user: { name: 'Jubilio', whatsapp_number: '' }, settings: { household_name: 'Family', user_salary: 0, default_rent: 0, cash_balance: 0, financial_month_start_day: 25 } };
describe('settings values and selective persistence', () => {
  it('keeps SMS automation disabled after reloading string-valued settings', () => {
    expect(normalizeSettings({ sms_automation_enabled: 'false' }).sms_automation_enabled).toBe(false);
    expect(normalizeSettings({ sms_automation_enabled: 'true' }).sms_automation_enabled).toBe(true);
  });
  it('preserves zero and uses the same financial month setting as calculations', () => {
    const form = settingsForm({ ...state, settings: { ...state.settings, cycle_start: 1 } });
    expect(form.user_salary).toBe(0); expect(form.default_rent).toBe(0); expect(form.financial_month_start_day).toBe(25);
    expect(settingsActions({ ...form, financial_month_start_day: '31' }, form)).toEqual([{ type: 'UPDATE_SETTING', payload: { key: 'financial_month_start_day', value: 31 } }]);
  });
  it('does not write untouched defaults or send password in general settings', () => {
    const form = settingsForm(state);
    expect(settingsActions(form, form)).toEqual([]);
    expect(settingsActions({ ...form, password: 'shouldneverbesent', user_salary: '200' }, form)).toEqual([{ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: 200 } }]);
  });
  it('sends only changed household fields so changing its name cannot overwrite cash', () => {
    const form = settingsForm(state);
    expect(settingsActions({ ...form, household_name: 'New name' }, form)).toEqual([{ type: 'UPDATE_HOUSEHOLD', payload: { name: 'New name' } }]);
  });
  it.each([{ user_salary: '' }, { default_rent: -1 }, { cash_balance: Infinity }])('rejects invalid amounts %j', patch => {
    expect(validateSettings({ ...settingsForm(state), ...patch })).toBe('invalid_amount');
  });
  it('validates times, account ownership choices and phone numbers', () => {
    const form = settingsForm(state);
    expect(validateSettings({ ...form, default_income_account_id: '7' }, [{ id: 8 }])).toBe('invalid_account');
    expect(validateSettings({ ...form, daily_entry_reminder_time: '25:61' })).toBe('invalid_time');
    expect(validateSettings({ ...form, whatsapp_number: 'abc' })).toBe('invalid_whatsapp');
    expect(validateSettings(form)).toBeNull();
  });
});
