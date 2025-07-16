import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export const generateTokens = (payload: Omit<JwtPayload, 'iat' | 'exp'>) => {
  const token = (jwt.sign as any)(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = (jwt.sign as any)(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  
  return { token, refreshToken };
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (refreshToken: string): JwtPayload => {
  return jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;
};

export const generatePasswordResetToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'password-reset' }, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyPasswordResetToken = (token: string): { userId: string } => {
  const payload = jwt.verify(token, JWT_SECRET) as any;
  if (payload.type !== 'password-reset') {
    throw new Error('Invalid token type');
  }
  return { userId: payload.userId };
};