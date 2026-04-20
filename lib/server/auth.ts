import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

type AdminJwtPayload = {
  adminId: string;
};

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required.');
  }
  return secret;
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1d' });
}

export function verifyAdminRequest(req: NextRequest): { adminId: string } {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized');
  }

  const decoded = jwt.verify(token, getJwtSecret());
  if (!decoded || typeof decoded !== 'object' || !('adminId' in decoded)) {
    throw new Error('Unauthorized');
  }

  return { adminId: String(decoded.adminId) };
}
