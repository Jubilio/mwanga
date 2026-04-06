const controllersPath = './src/controllers/';
const controllers = [
  'auth.controller',
  'admin.controller',
  'accountController',
  'binth.controller',
  'budget.controller',
  'credit.controller',
  'debtController',
  'goal.controller',
  'insights.controller',
  'kyc.controller',
  'notification.controller',
  'patrimony.controller',
  'rental.controller',
  'settings.controller',
  'smsController',
  'transaction.controller',
  'vsla.controller',
  'xitique.controller'
];

controllers.forEach(name => {
  const path = `${controllersPath}${name}`;
  try {
    process.env.JWT_SECRET = 'test_secret';
    console.log(`Checking ${path}...`);
    const ctrl = require(path);
    console.log(`  OK - ${path} keys: ${Object.keys(ctrl).join(', ')}`);
  } catch (err) {
    console.log(`  ERROR - ${path}: ${err.message}`);
  }
});
