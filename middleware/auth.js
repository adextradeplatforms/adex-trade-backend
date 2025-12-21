// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });

  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { protect };
