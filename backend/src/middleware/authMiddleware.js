const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  console.log('Auth middleware called');
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader);
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  console.log('Token:', token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded user:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT error:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};