import { NextResponse } from 'next/server';
import { destroyClientUserSession } from '@/lib/auth';

export async function POST() {
  await destroyClientUserSession();
  return NextResponse.json({ success: true });
}

