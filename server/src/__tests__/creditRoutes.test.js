process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
const { isAdmin } = require('../middleware/auth.middleware');
const creditRoutes = require('../routes/credit.routes');

test('only admins can record a partner disbursement', () => {
  const layer = creditRoutes.stack.find(entry => entry.route?.path === '/applications/:applicationId/partner-disbursement');
  expect(layer.route.stack.map(entry => entry.handle)).toContain(isAdmin);
});

test('the old disburse route no longer exists', () => {
  expect(creditRoutes.stack.some(entry => entry.route?.path === '/disburse/:applicationId')).toBe(false);
});
