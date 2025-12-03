import { redirect } from 'next/navigation';
import { getSession, getCurrentClient } from '@/lib/auth';
import { getClientById } from '@/lib/queries';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const clientId = await getCurrentClient();

  if (!session) {
    redirect('/login');
  }

  if (!clientId) {
    redirect('/clients');
  }

  // Get client name for sidebar
  const client = await getClientById(clientId);

  return (
    <div className="flex min-h-screen bg-[var(--neutral-50)]">
      <Sidebar clientId={clientId} clientName={client?.name} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
