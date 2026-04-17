import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is mapping required' }, { status: 400 });
    }

    // Upsert the visitor session
    await prisma.visitor.upsert({
      where: { sessionId },
      update: { updatedAt: new Date() },
      create: { sessionId }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Analytics Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
