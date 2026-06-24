const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { requireAuth } = require('../middlewares/auth');
const { createRateLimiter } = require('../middlewares/rateLimit');

// Throttle login attempts to slow down brute-force / credential-stuffing.
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // per IP per window
  message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
});

// Public
router.post('/login', loginLimiter, authController.login);

// Authenticated
router.get('/me', requireAuth, authController.me);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
