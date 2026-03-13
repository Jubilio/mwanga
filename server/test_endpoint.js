const axios = require('axios');

async function test() {
    try {
        console.log('Testing GET /api/binth/insights/dashboard...');
        // We don't have a token here, but we should at least get a 401 if the route exists, 
        // or a 404 if it doesn't.
        const res = await axios.get('http://localhost:3001/api/binth/insights/dashboard');
        console.log('Response:', res.status);
    } catch (err) {
        if (err.response) {
            console.log('Status:', err.response.status);
            console.log('Data:', err.response.data);
        } else {
            console.log('Error:', err.message);
        }
    }
}

test();
