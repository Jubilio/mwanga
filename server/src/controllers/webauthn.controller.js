const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const { db } = require('../config/db');
const { redis } = require('../config/redis');
const { logAction } = require('../utils/audit');
const logger = require('../utils/logger');

const createSessionToken = (user) =>
  jwt.sign(
    { id: user.id, householdId: user.householdId, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

// The Relying Party ID is usually the domain name of the origin
const rpID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.EXPECTED_ORIGIN || `http://${rpID}:5173`;

// Generate Registration Options
const generateRegistration = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = req.user;

    const userPasskeysResult = await db.execute({
      sql: 'SELECT credential_id FROM passkeys WHERE user_id = $1',
      args: [userId]
    });

    const options = await generateRegistrationOptions({
      rpName: 'Mwanga Finance',
      rpID,
      userID: Buffer.from(userId.toString()),
      userName: user.email || `user_${userId}`,
      attestationType: 'none',
      excludeCredentials: userPasskeysResult.rows.map(passkey => ({
        id: Buffer.from(passkey.credential_id, 'base64url'),
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    // Save challenge to Redis for 5 minutes
    await redis.set(`webauthn_challenge_${userId}`, options.challenge, { ex: 300 });

    res.json(options);
  } catch (error) {
    logger.error('Error in generateRegistration: ', error);
    next(error);
  }
};

// Verify Registration Response
const verifyRegistration = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const body = req.body;

    const expectedChallenge = await redis.get(`webauthn_challenge_${userId}`);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'O desafio WebAuthn expirou ou nao existe. Tente novamente.' });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
      });
    } catch (error) {
      logger.error('Verification error: ', error);
      return res.status(400).json({ error: error.message });
    }

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType } = verification.registrationInfo;

      // Save passkey in DB
      await db.execute({
        sql: `INSERT INTO passkeys (user_id, credential_id, public_key_hash, counter, transports) 
              VALUES ($1, $2, $3, $4, $5)`,
        args: [
          userId,
          Buffer.from(credentialID).toString('base64url'),
          Buffer.from(credentialPublicKey).toString('base64url'),
          counter,
          credentialDeviceType
        ]
      });

      // Clear challenge
      await redis.del(`webauthn_challenge_${userId}`);
      
      await logAction(userId, 'REGISTER_PASSKEY', 'SECURITY', userId);

      return res.json({ verified: true });
    }

    return res.status(400).json({ error: 'Nao foi possivel verificar o registo (Device failure)' });
  } catch (error) {
    logger.error('Error in verifyRegistration: ', error);
    next(error);
  }
};

// Generate Authentication Options
const generateAuthentication = async (req, res, next) => {
  try {
    // A user might not be logged in to authenticate!
    // But they need to provide email first, so we know who they are.
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email necessario' });

    const result = await db.execute({ sql: 'SELECT id FROM users WHERE email = $1', args: [email] });
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Utilizador nao encontrado' });
    const userId = user.id;

    const passkeysResult = await db.execute({
      sql: 'SELECT credential_id, transports FROM passkeys WHERE user_id = $1',
      args: [userId]
    });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: passkeysResult.rows.map(passkey => ({
        id: Buffer.from(passkey.credential_id, 'base64url'),
        type: 'public-key',
        transports: passkey.transports ? [passkey.transports] : [],
      })),
      userVerification: 'preferred',
    });

    await redis.set(`webauthn_auth_challenge_${userId}`, options.challenge, { ex: 300 });

    res.json(options);
  } catch (error) {
    logger.error('Error in generateAuthentication: ', error);
    next(error);
  }
};

// Verify Authentication
const verifyAuthentication = async (req, res, next) => {
  try {
    const { email, response } = req.body;

    const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = $1', args: [email] });
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Utilizador nao encontrado' });
    const userId = user.id;

    const expectedChallenge = await redis.get(`webauthn_auth_challenge_${userId}`);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'O desafio WebAuthn expirou ou nao existe.' });
    }

    const passkeyResult = await db.execute({
      sql: 'SELECT * FROM passkeys WHERE credential_id = $1 AND user_id = $2',
      args: [response.id, userId]
    });
    const authenticator = passkeyResult.rows[0];

    if (!authenticator) {
      return res.status(400).json({ error: 'Dispositivo nao autorizado para este utilizador' });
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: response,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: Buffer.from(authenticator.credential_id, 'base64url'),
          credentialPublicKey: Buffer.from(authenticator.public_key_hash, 'base64url'),
          counter: Number(authenticator.counter),
        },
      });
    } catch (error) {
      logger.error('Auth verification error: ', error);
      return res.status(400).json({ error: error.message });
    }

    if (verification.verified && verification.authenticationInfo) {
      const { newCounter } = verification.authenticationInfo;

      await db.execute({
        sql: 'UPDATE passkeys SET counter = $1, last_used_at = NOW() WHERE id = $2',
        args: [newCounter, authenticator.id]
      });

      await redis.del(`webauthn_auth_challenge_${userId}`);
      
      await logAction(userId, 'LOGIN_PASSKEY', 'SECURITY', userId);

      const safeUser = { id: user.id, email: user.email, name: user.name, householdId: user.household_id, role: user.role };
      const token = createSessionToken(safeUser);

      // Async gamification
      const { evaluateUserBadges } = require('../services/gamificationEngine.service');
      evaluateUserBadges(user.id, user.household_id).catch(() => {});

      return res.json({ verified: true, user: safeUser, token });
    }

    return res.status(400).json({ error: 'Nao foi possivel verificar a assinatura biométrica.' });
  } catch (error) {
    logger.error('Error in verifyAuthentication: ', error);
    next(error);
  }
};

module.exports = {
  generateRegistration,
  verifyRegistration,
  generateAuthentication,
  verifyAuthentication
};
