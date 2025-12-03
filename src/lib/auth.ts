import { cookies } from 'next/headers';
import type { ClientUser, ClientUserPermissions } from './types';

const SESSION_COOKIE = 'imc_session';
const CLIENT_COOKIE = 'imc_client';
const CLIENT_USER_COOKIE = 'imc_client_user';

// Super Admin Session
export async function createSession(username: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, username, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CLIENT_COOKIE);
  cookieStore.delete(CLIENT_USER_COOKIE);
}

export async function setCurrentClient(clientId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_COOKIE, clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function getCurrentClient(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CLIENT_COOKIE)?.value || null;
}

export function validateCredentials(username: string, password: string): boolean {
  return username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD;
}

// Client User Session
export async function createClientUserSession(user: ClientUser): Promise<void> {
  const cookieStore = await cookies();
  
  const sessionData = JSON.stringify({
    id: user.id,
    client_id: user.client_id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
  });
  
  cookieStore.set(CLIENT_USER_COOKIE, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  
  // Also set the client cookie
  cookieStore.set(CLIENT_COOKIE, user.client_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function getClientUserSession(): Promise<{
  id: string;
  client_id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: ClientUserPermissions;
} | null> {
  const cookieStore = await cookies();
  const sessionData = cookieStore.get(CLIENT_USER_COOKIE)?.value;
  
  if (!sessionData) return null;
  
  try {
    return JSON.parse(sessionData);
  } catch {
    return null;
  }
}

export async function destroyClientUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_USER_COOKIE);
  cookieStore.delete(CLIENT_COOKIE);
}

// Check if user is super admin
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
