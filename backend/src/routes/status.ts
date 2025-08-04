/**
 * Status endpoint to show which features are enabled
 */
import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  const status = {
    app: 'Worrybox API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      ai_analysis: !!process.env.OPENAI_API_KEY,
      ai_moderation: !!process.env.OPENAI_API_KEY,
      ai_notifications: !!process.env.OPENAI_API_KEY,
      payments: process.env.DISABLE_PAYMENTS !== 'true',
      email_notifications: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER),
      database: !!process.env.DATABASE_URL,
    },
    mvp_mode: {
      payments_disabled: process.env.DISABLE_PAYMENTS === 'true',
      ai_fallbacks_enabled: !process.env.OPENAI_API_KEY,
      all_users_premium: process.env.DISABLE_PAYMENTS === 'true',
    },
    timestamp: new Date().toISOString()
  };

  res.json(status);
});

export default router;