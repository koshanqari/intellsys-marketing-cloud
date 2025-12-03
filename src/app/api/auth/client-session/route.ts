import { NextResponse } from 'next/server';
import { getClientUserSession } from '@/lib/auth';

export async function GET() {
  const session = await getClientUserSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json(session);
}

