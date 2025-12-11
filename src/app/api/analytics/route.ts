import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { 
  getAnalyticsSummary, 
  getTemplateStats, 
  getTemplateNames,
  getClientById,
  getClientMetrics,
  getMetricStats,
  getTemplateStatsWithMetrics
} from '@/lib/queries';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const clientUserSession = await getClientUserSession();
  
  // Allow both super admin and client users
  if (!session && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get client ID - from client user session or from admin's selected client
  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (session) {
    clientId = await getCurrentClient();
  }
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  try {
    // Fetch base analytics data first (these should always work)
    const [client, summary, templateStats, templateNames] = await Promise.all([
      getClientById(clientId),
      getAnalyticsSummary(clientId, startDate, endDate),
      getTemplateStats(clientId, startDate, endDate),
      getTemplateNames(clientId),
    ]);

    // Try to fetch dynamic metrics (may fail if table doesn't exist)
    let metrics: Awaited<ReturnType<typeof getClientMetrics>> = [];
    let metricStats: Awaited<ReturnType<typeof getMetricStats>> = [];
    let templateStatsWithMetrics: Awaited<ReturnType<typeof getTemplateStatsWithMetrics>> = [];

    try {
      metrics = await getClientMetrics(clientId);
      
      // Only fetch metric stats if we have metrics configured
      if (metrics.length > 0) {
        [metricStats, templateStatsWithMetrics] = await Promise.all([
          getMetricStats(clientId, undefined, startDate, endDate),
          getTemplateStatsWithMetrics(clientId, startDate, endDate),
        ]);
      } else {
        // Create templateStatsWithMetrics from templateStats for backward compatibility
        templateStatsWithMetrics = templateStats.map(t => ({
          template_name: t.template_name,
          total: t.total,
          metrics: [],
        }));
      }
    } catch (metricsError) {
      console.warn('Could not fetch metrics (table may not exist):', metricsError);
      // Create templateStatsWithMetrics from templateStats for backward compatibility
      templateStatsWithMetrics = templateStats.map(t => ({
        template_name: t.template_name,
        total: t.total,
        metrics: [],
      }));
    }

    return NextResponse.json({
      clientId,
      clientName: client?.name || 'Unknown',
      summary,
      templateStats,
      templateNames,
      // Dynamic metrics data
      metrics,
      metricStats,
      templateStatsWithMetrics,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
