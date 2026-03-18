const request = require('supertest');
const app = require('../src/app');

describe('Auth Routes', () => {
    it('should register a new user', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            });
        expect(response.status).toBe(201);
    });

    it('should login a user', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });
        expect(response.status).toBe(200);
    });
});