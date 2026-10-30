jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));

const { parseServiceAccount } = require('../services/push.service');

const account = {
  type: 'service_account',
  project_id: 'mwanga',
  client_email: 'firebase-adminsdk@mwanga.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
};

describe('parseServiceAccount', () => {
  it('reads pretty-printed JSON as downloaded from Firebase', () => {
    expect(parseServiceAccount(`\n${JSON.stringify(account, null, 2)}\n`)).toEqual(account);
  });

  it('reads base64-encoded JSON', () => {
    expect(parseServiceAccount(Buffer.from(JSON.stringify(account)).toString('base64'))).toEqual(account);
  });

  it('repairs double-escaped newlines in the private key', () => {
    const raw = JSON.stringify(account).replace(/\\n/g, '\\\\n');
    expect(parseServiceAccount(raw).private_key).toBe(account.private_key);
  });

  it('reports invalid JSON without echoing the value', () => {
    expect(() => parseServiceAccount('{"private_key": "SECRET"')).toThrow(/not valid JSON/);
    try { parseServiceAccount('{"private_key": "SECRET"'); } catch (e) { expect(e.message).not.toContain('SECRET'); }
  });

  it('names missing fields', () => {
    expect(() => parseServiceAccount('{"type":"service_account"}')).toThrow('missing: project_id, client_email, private_key');
  });
});
