import { NextRequest, NextResponse } from 'next/server';
import { getSession, setCurrentClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clientId } = await request.json();
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    await setCurrentClient(clientId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to select client' },
      { status: 500 }
    );
  }
}
