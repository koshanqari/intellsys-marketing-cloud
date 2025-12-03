'use client';

import { useParams } from 'next/navigation';
import TemplateDetail from '@/components/analytics/TemplateDetail';

export default function DashboardTemplateDetailPage() {
  const params = useParams();
  const templateName = decodeURIComponent(params.templateName as string);

  return (
    <TemplateDetail
      templateName={templateName}
      basePath="/dashboard"
      loginPath="/login"
      clientsPath="/clients"
    />
  );
}
