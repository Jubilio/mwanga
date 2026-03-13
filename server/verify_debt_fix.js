const { addDebt, getDebts } = require('./src/controllers/debtController');
const { db } = require('./src/config/db');

// Mock req, res
const req = {
    user: { id: 1, householdId: 1 },
    body: {
        creditor_name: 'Test Creditor ' + Date.now(),
        total_amount: 1000,
        due_date: '2023-12-31'
    }
};

const res = {
    statusCode: 0,
    data: null,
    status: function(s) { this.statusCode = s; return this; },
    json: function(data) { this.data = data; return this; }
};

async function test() {
    try {
        console.log('Testing addDebt...');
        await addDebt(req, res);
        console.log('Status code:', res.statusCode);
        console.log('Response data:', res.data);

        if (res.statusCode === 201) {
            console.log('SUCCESS: Debt added with householdId.');
            const row = db.prepare('SELECT * FROM debts WHERE id = ?').get(res.data.id);
            console.log('DB Row:', row);
            if (row.household_id === 1) {
                console.log('SUCCESS: household_id in DB is correct (1).');
            } else {
                console.log('FAILURE: household_id in DB is', row.household_id);
            }
        } else {
            console.log('FAILURE: addDebt failed.');
        }
    } catch (err) {
        console.error('ERROR during test:', err);
    }
    process.exit(0);
}

test().catch(e => {
    console.error(e);
    process.exit(1);
});
