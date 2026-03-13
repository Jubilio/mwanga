const axios = require('axios');

async function testAuth() {
    try {
        console.log('Attempting to register a test user...');
        const regRes = await axios.post('http://localhost:3001/api/auth/register', {
            name: 'Test Auth',
            email: 'auth_test_' + Date.now() + '@example.com',
            password: 'password123'
        });
        
        const token = regRes.data.token;
        console.log('Registration successful, token received.');
        
        console.log('Attempting to access /api/auth/me with the new token...');
        const meRes = await axios.get('http://localhost:3001/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Successfully accessed /api/auth/me:', meRes.data);
        console.log('AUTH IS WORKING CORRECTLY.');
        
    } catch (err) {
        console.error('AUTH TEST FAILED:', err.response ? err.response.data : err.message);
    }
}

testAuth();
