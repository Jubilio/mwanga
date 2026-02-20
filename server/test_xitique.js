// Native fetch used in Node 22+

async function test() {
  const url = 'http://localhost:3001/api';
  console.log('--- Testing Xitique API ---');

  try {
    // 1. Create Xitique
    console.log('1. Creating Xitique...');
    const res1 = await fetch(`${url}/xitiques`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Teste Xitique',
        monthlyAmount: 1000,
        totalParticipants: 3,
        startDate: '2026-03-01',
        yourPosition: 2
      })
    });
    const xitique = await res1.json();
    console.log('Created:', xitique);

    // 2. Verify Cycles
    console.log('2. Verifying cycles...');
    const res2 = await fetch(`${url}/xitiques`);
    const list = await res2.json();
    const created = list.find(x => x.id === xitique.id);
    console.log('Group with cycles count:', created.cycles.length);
    console.log('Contributions count:', created.contributions.length);
    console.log('Receipts count:', created.receipts.length);

    // 3. Pay first contribution
    console.log('3. Paying contribution...');
    const conId = created.contributions[0].id;
    await fetch(`${url}/xitiques/pay/${conId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-03-05' })
    });
    console.log('Paid contribution');

    // 4. Verify transaction
    console.log('4. Verifying transaction entry...');
    const res3 = await fetch(`${url}/transactions`);
    const txs = await res3.json();
    const tx = txs.find(t => t.category === 'Xitique');
    console.log('Found transaction:', tx.description, tx.amount);

    console.log('--- TEST SUCCESSFUL ---');
  } catch (e) {
    console.error('--- TEST FAILED ---', e);
  }
}

test();
