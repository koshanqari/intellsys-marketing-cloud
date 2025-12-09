import { NextRequest, NextResponse } from 'next/server';
import { createSession, validateCredentials, createClientUserSession, destroySession, destroyClientUserSession } from '@/lib/auth';
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

    // First, check if it's a super admin login
    if (validateCredentials(username, password)) {
      // Clear any existing client user session first
      await destroyClientUserSession();
      await createSession(username);
      return NextResponse.json({ 
        success: true, 
        userType: 'admin',
        redirectTo: '/clients'
      });
    }

    // If not super admin, check if it's a client user (using email)
    const clientUser = await validateClientUserPassword(username, password);
    if (clientUser) {
      // Clear any existing admin session first
      await destroySession();
      await createClientUserSession(clientUser);
      return NextResponse.json({ 
        success: true, 
        userType: 'client',
        redirectTo: '/dashboard/analytics'
      });
    }

    // If neither, return error
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

