jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/audit', () => ({ logAction: jest.fn() }));
jest.mock('../controllers/dashboard.controller', () => ({ invalidateDashboardCache: jest.fn() }));
jest.mock('../services/auth.service', () => ({ createSessionToken: jest.fn(() => 'session'), createGooglePasswordHash: jest.fn() }));
const mockGetTokenInfo = jest.fn();
jest.mock('google-auth-library', () => ({ OAuth2Client: jest.fn(() => ({ getTokenInfo: mockGetTokenInfo })) }));
process.env.GOOGLE_CLIENT_ID = 'web-client.apps.googleusercontent.com';
const { db } = require('../config/db');
const { googleAccessTokenLogin } = require('../controllers/auth.controller');
const res = () => { const response = { status: jest.fn(), json: jest.fn() }; response.status.mockReturnValue(response); return response; };
beforeEach(() => jest.clearAllMocks());

test('rejects a token Google does not recognise', async () => {
  mockGetTokenInfo.mockRejectedValueOnce(new Error('invalid_token'));
  const response = res();
  await googleAccessTokenLogin({ body: { email: 'victim@example.com', accessToken: 'forged' } }, response);
  expect(response.status).toHaveBeenCalledWith(401); expect(db.execute).not.toHaveBeenCalled();
});

test('rejects a token issued to another client', async () => {
  mockGetTokenInfo.mockResolvedValueOnce({ aud: 'other-app', azp: 'other-app', email: 'victim@example.com', email_verified: true });
  const response = res();
  await googleAccessTokenLogin({ body: { accessToken: 'token-for-other-app' } }, response);
  expect(response.status).toHaveBeenCalledWith(401); expect(db.execute).not.toHaveBeenCalled();
});

test('logs in the account Google vouches for, ignoring the email in the body', async () => {
  mockGetTokenInfo.mockResolvedValueOnce({ aud: process.env.GOOGLE_CLIENT_ID, email: 'Real@Example.com', email_verified: true });
  db.execute.mockResolvedValueOnce({ rows: [{ id: 3, name: 'Real', email: 'real@example.com', household_id: 9, role: 'user' }] });
  const response = res();
  await googleAccessTokenLogin({ body: { email: 'victim@example.com', accessToken: 'good' } }, response);
  expect(db.execute).toHaveBeenCalledWith(expect.objectContaining({ args: ['real@example.com'] }));
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'session', created: false }));
});
