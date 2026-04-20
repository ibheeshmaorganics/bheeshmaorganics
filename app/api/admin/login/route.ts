import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { signAdminToken } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';

function getRequestIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = (await req.json()) as { username?: string; password?: string };
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const ip = getRequestIp(req);
    const ipRate = checkRateLimit(`admin-login-ip:${ip}`, {
      windowMs: 15 * 60 * 1000,
      max: 30,
      blockDurationMs: 15 * 60 * 1000,
    });
    if (!ipRate.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    const userRate = checkRateLimit(`admin-login-user:${username.toLowerCase()}`, {
      windowMs: 15 * 60 * 1000,
      max: 8,
      blockDurationMs: 15 * 60 * 1000,
    });
    if (!userRate.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      console.warn('Admin login failed: unknown username', { username, ip });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      console.warn('Admin login failed: invalid password', { username, ip });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signAdminToken({ adminId: admin.id });

    const response = NextResponse.json({ success: true });
    response.headers.set(
      'Set-Cookie',
      serialize('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400,
        path: '/',
      })
    );

    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    'Set-Cookie',
    serialize('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: -1,
      path: '/',
    })
  );
  return response;
}
