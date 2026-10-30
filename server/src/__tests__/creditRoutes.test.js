process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
const { isAdmin } = require('../middleware/auth.middleware');
const creditRoutes = require('../routes/credit.routes');

test('only admins can disburse a credit application', () => {
  const layer = creditRoutes.stack.find(entry => entry.route?.path === '/disburse/:applicationId');
  expect(layer.route.stack.map(entry => entry.handle)).toContain(isAdmin);
});
