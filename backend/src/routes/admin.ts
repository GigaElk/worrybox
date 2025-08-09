import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

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