import TemplateAnalyticsList from '@/components/analytics/TemplateAnalyticsList';

export default function DashboardAnalyticsPage() {
  return (
    <TemplateAnalyticsList
      basePath="/dashboard"
      loginPath="/login"
      clientsPath="/clients"
    />
  );
}
