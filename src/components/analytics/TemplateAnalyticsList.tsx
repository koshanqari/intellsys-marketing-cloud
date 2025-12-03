'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search,
  FileText,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface TemplateStats {
  template_name: string;
  total: number;
  delivered: number;
  read: number;
  failed: number;
}

interface AnalyticsData {
  clientId: string;
  clientName: string;
  templateStats: TemplateStats[];
}

interface TemplateAnalyticsListProps {
  basePath: string; // '/dashboard' or '/portal'
  loginPath: string; // '/login' or '/portal/login'
  clientsPath?: string; // '/clients' - only for admin
}

export default function TemplateAnalyticsList({ 
  basePath, 
  loginPath,
  clientsPath 
}: TemplateAnalyticsListProps) {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAnalytics = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const response = await fetch('/api/analytics');
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push(loginPath);
          return;
        }
        if (response.status === 400 && clientsPath) {
          router.push(clientsPath);
          return;
        }
        throw new Error('Failed to fetch analytics');
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const filteredTemplates = data?.templateStats.filter(template =>
    template.template_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleTemplateClick = (templateName: string) => {
    router.push(`${basePath}/analytics/${encodeURIComponent(templateName)}`);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--neutral-200)] rounded w-1/4" />
          <div className="h-12 bg-[var(--neutral-200)] rounded w-full max-w-md" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[var(--neutral-200)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Card className="text-center py-12 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-[var(--error)] mb-4" />
          <h2 className="text-lg font-medium text-[var(--neutral-900)]">Failed to load analytics</h2>
          <p className="mt-1 text-[var(--neutral-600)]">Please try again later.</p>
          <Button className="mt-4" onClick={() => fetchAnalytics()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--neutral-900)]">Template Analytics</h1>
          <p className="mt-1 text-[var(--neutral-600)]">
            WhatsApp templates for <span className="font-medium text-[var(--primary)]">{data.clientName}</span>
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--neutral-400)]" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-3">
        {filteredTemplates.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-[var(--neutral-400)] mb-4" />
            <h2 className="text-lg font-medium text-[var(--neutral-900)]">
              {searchQuery ? 'No templates found' : 'No templates available'}
            </h2>
            <p className="mt-1 text-[var(--neutral-600)]">
              {searchQuery ? 'Try a different search term' : 'No message templates have been used yet.'}
            </p>
          </Card>
        ) : (
          filteredTemplates.map((template) => {
            const deliveryRate = template.total > 0 
              ? Math.round((template.delivered / template.total) * 100) 
              : 0;
            const readRate = template.total > 0 
              ? Math.round((template.read / template.total) * 100) 
              : 0;

            return (
              <Card
                key={template.template_name}
                className="cursor-pointer hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)] transition-all group"
                onClick={() => handleTemplateClick(template.template_name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[var(--neutral-900)] group-hover:text-[var(--primary)] transition-colors">
                        {template.template_name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-[var(--neutral-600)]">
                          {template.total.toLocaleString()} sent
                        </span>
                        <span className="text-sm text-[var(--success)]">
                          {template.delivered.toLocaleString()} delivered ({deliveryRate}%)
                        </span>
                        <span className="text-sm text-[var(--primary)]">
                          {template.read.toLocaleString()} read ({readRate}%)
                        </span>
                        {template.failed > 0 && (
                          <span className="text-sm text-[var(--error)]">
                            {template.failed.toLocaleString()} failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--neutral-100)] group-hover:bg-[var(--primary-light)] transition-colors">
                    <ArrowRight className="w-5 h-5 text-[var(--neutral-400)] group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Summary */}
      {filteredTemplates.length > 0 && (
        <p className="mt-4 text-sm text-[var(--neutral-400)]">
          Showing {filteredTemplates.length} of {data.templateStats.length} templates
        </p>
      )}
    </div>
  );
}

