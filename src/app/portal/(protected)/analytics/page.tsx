import { redirect } from 'next/navigation';
import { getClientUserSession } from '@/lib/auth';
import TemplateAnalyticsList from '@/components/analytics/TemplateAnalyticsList';

export default async function PortalAnalyticsPage() {
  const userSession = await getClientUserSession();

  if (!userSession) {
    redirect('/portal/login');
  }

  if (!userSession.permissions.analytics) {
    redirect('/portal');
  }

  return (
    <TemplateAnalyticsList
      basePath="/portal"
      loginPath="/portal/login"
    />
  );
}
