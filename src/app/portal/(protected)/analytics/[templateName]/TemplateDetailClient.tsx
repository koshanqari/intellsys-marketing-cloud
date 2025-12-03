'use client';

import TemplateDetail from '@/components/analytics/TemplateDetail';

interface TemplateDetailClientProps {
  templateName: string;
}

export default function TemplateDetailClient({ templateName }: TemplateDetailClientProps) {
  return (
    <TemplateDetail
      templateName={templateName}
      basePath="/portal"
      loginPath="/portal/login"
    />
  );
}

