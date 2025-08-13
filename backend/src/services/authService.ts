import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types/auth';
import { generateTokens, generatePasswordResetToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';

const prisma = new PrismaClient();

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, username, password } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('Email already registered');
      }
      if (existingUser.username === username.toLowerCase()) {
        throw new Error('Username already taken');
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        displayName: username,
      },
    });

    // Create default subscription with 30-day premium trial
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days from now

    await prisma.subscription.create({
      data: {
        userId: user.id,
        tier: 'premium', // Start with premium during trial
        status: 'active',
        trialEndsAt: trialEndDate,
      },
    });

    // Create default notification preferences
    await prisma.notificationPreferences.create({
      data: {
        userId: user.id,
      },
    });

    // Generate tokens
    const { token, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // Send verification email (don't await to avoid blocking)
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
      const verificationToken = generatePasswordResetToken(user.id);
      sendVerificationEmail(user.email, verificationToken)
        .then(async () => {
          // Mark welcome email as sent
          await prisma.user.update({
            where: { id: user.id },
            data: {
              welcomeEmailSent: true,
              welcomeEmailSentAt: new Date(),
            },
          });
          console.log('📧 Welcome email sent and tracked for:', user.email);
        })
        .catch(console.error);
    } else {
      console.log('📧 Email disabled - welcome email not sent');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        emailVerified: user.emailVerified,
        // Location fields (will be null for new users)
        country: user.country || undefined,
        region: user.region || undefined,
        city: user.city || undefined,
        locationSharing: user.locationSharing,
      },
      token,
      refreshToken,
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const { token, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        emailVerified: user.emailVerified,
        // Location fields (will be null for existing users until they set them)
        country: user.country || undefined,
        region: user.region || undefined,
        city: user.city || undefined,
        locationSharing: user.locationSharing,
      },
      token,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const { verifyRefreshToken } = await import('../utils/jwt');
      const payload = verifyRefreshToken(refreshToken);

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return;
    }

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
      throw new Error('Email service not configured. Password reset unavailable.');
    }

    const resetToken = generatePasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, resetToken);
    console.log('📧 Password reset email sent to:', user.email);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const { verifyPasswordResetToken } = await import('../utils/jwt');
      const { userId } = verifyPasswordResetToken(token);

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const { verifyPasswordResetToken } = await import('../utils/jwt');
      const { userId } = verifyPasswordResetToken(token);

      await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });
    } catch (error) {
      throw new Error('Invalid or expired verification token');
    }
  }

  async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        emailVerified: true,
        // Location fields
        country: true,
        region: true,
        city: true,
        locationSharing: true,
        createdAt: true,
      },
    });
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return !existingUser;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    return !existingUser;
  }
}