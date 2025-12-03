import { redirect } from 'next/navigation';
import { getClientUserSession } from '@/lib/auth';
import TemplateDetailClient from './TemplateDetailClient';

interface PageProps {
  params: Promise<{ templateName: string }>;
}

export default async function PortalTemplateDetailPage({ params }: PageProps) {
  const userSession = await getClientUserSession();

  if (!userSession) {
    redirect('/portal/login');
  }

  if (!userSession.permissions.analytics) {
    redirect('/portal');
  }

  const { templateName } = await params;

  return <TemplateDetailClient templateName={decodeURIComponent(templateName)} />;
}
