const authService = require('../services/auth.service');
const { db } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/email.service');
const { logAction } = require('../utils/audit');
const cryptoService = require('../utils/crypto.service');

// Mocks
jest.mock('../middleware/auth.middleware', () => ({
  JWT_SECRET: 'test_secret_123'
}));

jest.mock('../config/db', () => ({
  db: {
    execute: jest.fn()
  }
}));

jest.mock('../services/email.service', () => ({
  sendPasswordReset: jest.fn()
}));

jest.mock('../utils/audit', () => ({
  logAction: jest.fn()
}));

jest.mock('../utils/crypto.service', () => ({
  encrypt: jest.fn(val => `encrypted_${val}`),
  decrypt: jest.fn(val => val.startsWith('encrypted_') ? val.replace('encrypted_', '') : val)
}));

jest.mock('../services/gamificationEngine.service', () => ({
  evaluateUserBadges: jest.fn().mockResolvedValue({})
}));

// Mock bcrypt to avoid slow tests, but keep it functional enough
jest.mock('bcryptjs', () => ({
  genSaltSync: jest.fn(() => 'salt'),
  hashSync: jest.fn((pass) => `hashed_${pass}`),
  compareSync: jest.fn((pass, hash) => hash === `hashed_${pass}`)
}));

// We can also spy on jwt.sign to verify it's called
jest.spyOn(jwt, 'sign');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should throw EMAIL_EXISTS if email is already in db', async () => {
      db.execute.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Email exists
      
      await expect(authService.registerUser({ email: 'test@test.com' }))
        .rejects.toThrow('EMAIL_EXISTS');
    });

    it('should register a user and create a household if no invite code is provided', async () => {
      // 1. Check email -> empty
      db.execute.mockResolvedValueOnce({ rows: [] });
      // 2. Insert household -> returns householdId 99
      db.execute.mockResolvedValueOnce({ rows: [{ id: 99 }] });
      // 3. Insert user -> returns userId 42
      db.execute.mockResolvedValueOnce({ rows: [{ id: 42 }] });

      const data = {
        name: 'John',
        email: 'john@test.com',
        password: 'password123',
        householdName: 'John Home'
      };

      const result = await authService.registerUser(data);

      expect(db.execute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining('INSERT INTO households'),
        args: ['John Home']
      });

      expect(db.execute).toHaveBeenNthCalledWith(3, {
        sql: expect.stringContaining('INSERT INTO users'),
        args: ['John', 'john@test.com', 'hashed_password123', 99]
      });

      expect(logAction).toHaveBeenCalledWith(42, 'REGISTER', 'USER', 42);
      expect(result.user).toEqual({
        id: 42,
        name: 'John',
        email: 'john@test.com',
        householdId: 99,
        role: 'user'
      });
      expect(result.token).toBeDefined();
    });

    it('should throw INVALID_INVITE if invite code is not found', async () => {
      // 1. Check email -> empty
      db.execute.mockResolvedValueOnce({ rows: [] });
      // 2. Check invite -> empty
      db.execute.mockResolvedValueOnce({ rows: [] });

      await expect(authService.registerUser({ email: 'john@test.com', inviteCode: 'BAD_CODE' }))
        .rejects.toThrow('INVALID_INVITE');
    });
  });

  describe('authenticateUser', () => {
    it('should throw INVALID_CREDENTIALS if user not found', async () => {
      db.execute.mockResolvedValueOnce({ rows: [] });

      await expect(authService.authenticateUser('test@test.com', 'password123'))
        .rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw INVALID_CREDENTIALS if password does not match', async () => {
      db.execute.mockResolvedValueOnce({ 
        rows: [{ id: 1, password_hash: 'hashed_differentpassword' }] 
      });

      await expect(authService.authenticateUser('test@test.com', 'password123'))
        .rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should authenticate user and return token and user data', async () => {
      db.execute.mockResolvedValueOnce({ 
        rows: [{ 
          id: 42, 
          email: 'test@test.com', 
          password_hash: 'hashed_password123',
          name: 'John',
          household_id: 99,
          role: 'admin'
        }] 
      });

      const result = await authService.authenticateUser('test@test.com', 'password123');

      expect(logAction).toHaveBeenCalledWith(42, 'LOGIN', 'USER', 42);
      expect(result.user).toEqual({
        id: 42,
        name: 'John',
        email: 'test@test.com',
        householdId: 99,
        role: 'admin'
      });
      expect(result.token).toBeDefined();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile and decrypt nationalId', async () => {
      db.execute.mockResolvedValueOnce({ 
        rows: [{ 
          id: 42, 
          email: 'test@test.com', 
          password_hash: 'hashed_pw',
          name: 'John',
          household_id: 99,
          national_id: 'encrypted_123456789'
        }] 
      });

      const result = await authService.getUserProfile(42);

      expect(cryptoService.decrypt).toHaveBeenCalledWith('encrypted_123456789');
      expect(result).toEqual({
        id: 42,
        email: 'test@test.com',
        name: 'John',
        householdId: 99,
        nationalId: '123456789',
        role: 'user'
      });
      expect(result.password_hash).toBeUndefined(); // Should omit password hash
    });
  });

  describe('updateProfile', () => {
    it('should update name and encrypt nationalId', async () => {
      db.execute.mockResolvedValueOnce({});

      await authService.updateProfile(42, { name: 'Jane', nationalId: '987654321' });

      expect(cryptoService.encrypt).toHaveBeenCalledWith('987654321');
      expect(db.execute).toHaveBeenCalledWith({
        sql: 'UPDATE users SET name = $1, "nationalId" = $2 WHERE id = $3',
        args: ['Jane', 'encrypted_987654321', 42]
      });
      expect(logAction).toHaveBeenCalledWith(42, 'UPDATE_PROFILE', 'USER', 42);
    });
  });

  describe('Password Reset Flow', () => {
    it('initiatePasswordReset should pretend success if email not found', async () => {
      db.execute.mockResolvedValueOnce({ rows: [] });

      const result = await authService.initiatePasswordReset('nobody@test.com');
      
      expect(result).toEqual({ success: true });
      expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('initiatePasswordReset should generate token, update db and send email', async () => {
      db.execute.mockResolvedValueOnce({ rows: [{ id: 42, name: 'John', email: 'john@test.com' }] });
      db.execute.mockResolvedValueOnce({});

      const result = await authService.initiatePasswordReset('john@test.com');
      
      expect(result).toEqual({ success: true });
      expect(db.execute).toHaveBeenCalledTimes(2);
      expect(db.execute.mock.calls[1][0].sql).toContain('UPDATE users SET reset_password_token');
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith('john@test.com', expect.any(String), 'John');
    });

    it('completePasswordReset should throw INVALID_TOKEN if not found', async () => {
      db.execute.mockResolvedValueOnce({ rows: [] });

      await expect(authService.completePasswordReset('bad_token', 'newpass'))
        .rejects.toThrow('INVALID_TOKEN');
    });

    it('completePasswordReset should update password and clear token', async () => {
      db.execute.mockResolvedValueOnce({ rows: [{ id: 42 }] });
      db.execute.mockResolvedValueOnce({});

      const result = await authService.completePasswordReset('good_token', 'newpass');

      expect(result).toEqual({ success: true });
      expect(db.execute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining('UPDATE users SET password_hash'),
        args: ['hashed_newpass', 42]
      });
      expect(logAction).toHaveBeenCalledWith(42, 'RESET_PASSWORD', 'USER', 42);
    });
  });
});
