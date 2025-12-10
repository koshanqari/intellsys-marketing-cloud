import { NextResponse } from 'next/server';
import { getSession, getClientUserSession } from '@/lib/auth';

export async function GET() {
  try {
    const adminSession = await getSession();
    const clientUserSession = await getClientUserSession();

    // Client user session takes precedence if both exist
    if (clientUserSession) {
      return NextResponse.json({ 
        isAdmin: false,
        isAuthenticated: true,
        permissions: clientUserSession.permissions,
        userName: clientUserSession.name || clientUserSession.email,
        userEmail: clientUserSession.email
      });
    }

    // Check for super admin session
    if (adminSession) {
      return NextResponse.json({ 
        isAdmin: true,
        isAuthenticated: true,
        userName: adminSession
      });
    }

    return NextResponse.json({ 
      isAdmin: false,
      isAuthenticated: false
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

