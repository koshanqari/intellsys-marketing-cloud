import { redirect } from 'next/navigation';
import { getSession, getClientUserSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();
  const clientUserSession = await getClientUserSession();
  
  // Check for client user session first (takes precedence)
  if (clientUserSession) {
    redirect('/dashboard/analytics');
  }
  
  // Check for super admin session
  if (session) {
    redirect('/clients');
  }
  
  // No session - redirect to login
  redirect('/login');
}
