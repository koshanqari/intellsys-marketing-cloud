import { redirect } from 'next/navigation';
import { getClientUserSession } from '@/lib/auth';

export default async function PortalHome() {
  const userSession = await getClientUserSession();

  if (!userSession) {
    redirect('/portal/login');
  }

  // Redirect to first available permission
  if (userSession.permissions.analytics) {
    redirect('/portal/analytics');
  } else if (userSession.permissions.templates) {
    redirect('/portal/templates');
  } else {
    // No permissions - show empty state
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[var(--neutral-900)]">Welcome</h1>
          <p className="mt-2 text-[var(--neutral-600)]">
            You don&apos;t have access to any features yet. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }
}

