// routes/protected.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect, (req, res) => {
  // demo response for frontend dashboard
  res.json({
    name: req.user.name,
    email: req.user.email,
    inviteCode: req.user.inviteCode || 'XXXXXX',
    balance: req.user.balance || 0,
    plans: [
      { id: 'vext', name: 'VEXT Robot', daily: 0.02, min: 20 },
      { id: 'quantum', name: 'Quantum Boost', daily: 0.025, min: 100 }
    ]
  });
});

module.exports = router;

