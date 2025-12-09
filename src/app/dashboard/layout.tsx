import { redirect } from 'next/navigation';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { getClientById } from '@/lib/queries';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const clientUserSession = await getClientUserSession();
  
  // Allow both super admin and client users
  if (!session && !clientUserSession) {
    redirect('/login');
  }

  // Determine if user is super admin (only if admin session exists AND no client user session)
  // Client user session takes precedence if both exist
  const isSuperAdmin = !!session && !clientUserSession;

  // Get client ID - from client user session or from admin's selected client
  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (session) {
    clientId = await getCurrentClient();
    if (!clientId) {
      redirect('/clients');
    }
  }

  if (!clientId) {
    // Client users should go to login if no client ID
    redirect(isSuperAdmin ? '/clients' : '/login');
  }

  // Get client name for sidebar
  const client = await getClientById(clientId);
  
  // Get permissions for client users
  const permissions = clientUserSession?.permissions || null;
  
  // Get user info for display
  const userName = clientUserSession?.name || clientUserSession?.email || (session ? session : null);
  const userEmail = clientUserSession?.email || null;

  return (
    <div className="flex min-h-screen bg-[var(--neutral-50)]">
      <Sidebar 
        clientId={clientId} 
        clientName={client?.name}
        isSuperAdmin={isSuperAdmin}
        permissions={permissions}
        userName={userName}
        userEmail={userEmail}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
