import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// TEMPORARY DEBUG ENDPOINT - Check current user subscription status
router.get('/debug-my-subscription', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Decode token to get user ID (simplified)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token) as any;
    const userId = decoded?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, createdAt: true }
    });
    
    res.json({
      user,
      subscription,
      currentDate: new Date(),
      trialActive: subscription?.trialEndsAt ? new Date() < subscription.trialEndsAt : false,
      trialEndsAt: subscription?.trialEndsAt
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY DEBUG ENDPOINT - Check user subscription status
router.get('/debug-subscription/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, createdAt: true }
    });
    
    res.json({
      user,
      subscription,
      currentDate: new Date(),
      trialActive: subscription?.trialEndsAt ? new Date() < subscription.trialEndsAt : false
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY ADMIN ENDPOINT - REMOVE AFTER USE!
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, newPassword, adminKey } = req.body;
    
    // Simple admin key check (you can set this in your .env)
    if (adminKey !== process.env.ADMIN_RESET_KEY && adminKey !== 'TEMP_RESET_2024') {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update the user's password
    const updatedUser = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash },
      select: { id: true, email: true, username: true }
    });
    
    res.json({
      message: 'Password reset successfully',
      user: updatedUser
    });
    
  } catch (error: any) {
    console.error('Admin password reset error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      details: error.message
    });
  }
});

export default router;