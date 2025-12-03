import { redirect } from 'next/navigation';
import { getClientUserSession } from '@/lib/auth';
import { getClientById } from '@/lib/queries';
import PortalSidebar from '@/components/PortalSidebar';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userSession = await getClientUserSession();

  if (!userSession) {
    redirect('/portal/login');
  }

  const client = await getClientById(userSession.client_id);

  return (
    <div className="flex min-h-screen bg-[var(--neutral-50)]">
      <PortalSidebar 
        clientName={client?.name || 'Client'} 
        userName={userSession.name || userSession.email}
        permissions={userSession.permissions}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

