import { NextRequest, NextResponse } from 'next/server';
import { createClientUserSession } from '@/lib/auth';
import { validateClientUserPassword } from '@/lib/client-users';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await validateClientUserPassword(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    await createClientUserSession(user);

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        permissions: user.permissions,
      }
    });
  } catch (error) {
    console.error('Client login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

