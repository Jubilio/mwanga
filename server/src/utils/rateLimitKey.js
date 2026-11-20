const jwt = require('jsonwebtoken');

// Key for the general API rate limit: the user id when the request carries a valid
// session token, otherwise the client IP. The token is verified, not just decoded,
// so a made-up token cannot be used to get a fresh quota.
function rateLimitKey(req) {
  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const secret = process.env.JWT_SECRET;
  if (token && secret) {
    try {
      const payload = jwt.verify(token, secret);
      const userId = Number(payload.id || payload.userId || payload.user_id);
      if (userId) return `user:${userId}`;
    } catch {
      // Expired or invalid token: fall back to the IP.
    }
  }
  return `ip:${req.ip}`;
}

module.exports = { rateLimitKey };
