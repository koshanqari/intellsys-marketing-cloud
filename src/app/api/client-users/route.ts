import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient } from '@/lib/auth';
import { getClientUsers, createClientUser } from '@/lib/client-users';

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = await getCurrentClient();
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  try {
    const users = await getClientUsers(clientId);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch client users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = await getCurrentClient();
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await createClientUser({
      client_id: clientId,
      email: body.email,
      password: body.password,
      name: body.name,
      role: body.role,
      permissions: body.permissions,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Failed to create client user:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    
    if (message.includes('duplicate key') || message.includes('unique')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

