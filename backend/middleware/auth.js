const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || 
    jwtSecret === '<GENERATE_SECURE_RANDOM_SECRET>' || 
    jwtSecret.startsWith('<') || 
    jwtSecret.includes('GENERATE_SECURE_RANDOM_SECRET')) {
  jwtSecret = crypto.randomBytes(32).toString('hex');
}
const JWT_SECRET = jwtSecret;


// Middleware to verify JWT token and inject user details
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified; // { id, email, role }
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or Expired Token' });
  }
}

// Middleware to check specific user roles
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access Denied: Insufficient Permissions' });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
  JWT_SECRET
};
