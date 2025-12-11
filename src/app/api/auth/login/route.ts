import { NextRequest, NextResponse } from 'next/server';
import { createSession, validateCredentials, createClientUserSession } from '@/lib/auth';
import { validateClientUserPassword } from '@/lib/client-users';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Try super admin credentials first
    if (validateCredentials(username, password)) {
      await createSession(username);
      return NextResponse.json({ 
        success: true, 
        userType: 'admin' 
      });
    }

    // Try client user credentials (username can be email)
    const clientUser = await validateClientUserPassword(username, password);
    if (clientUser) {
      await createClientUserSession(clientUser);
      return NextResponse.json({ 
        success: true, 
        userType: 'client',
        user: {
          id: clientUser.id,
          email: clientUser.email,
          name: clientUser.name,
          permissions: clientUser.permissions,
        }
      });
    }

    // Neither worked
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

