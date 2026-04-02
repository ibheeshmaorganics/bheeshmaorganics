import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'bheeshma_super_secret_key_2026';

export async function POST(req: NextRequest) {
  try {
    // Automatically seed the first admin credential into DB if it doesn't exist
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);
      await prisma.admin.create({
        data: {
          username: defaultUsername,
          passwordHash,
        }
      });
      console.log('Seeded default admin into DB');
    }

    const { username, password } = await req.json();

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '1d' });

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
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Server error: ' + errorMsg }, { status: 500 });
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
