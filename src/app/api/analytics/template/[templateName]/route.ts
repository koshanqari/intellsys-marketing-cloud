import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getClientMetrics, getMetricStats } from '@/lib/queries';

interface TemplateMessage {
  id: string;
  name: string | null;
  phone: string | null;
  status_code: number | null;
  status_message: string | null;
  message_status: string | null;
  message_status_detailed: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateName: string }> }
) {
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

  const { templateName } = await params;
  const decodedTemplateName = decodeURIComponent(templateName);

  // Get date filter from query params
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Build date filter clause
  let dateFilter = '';
  const queryParams: (string | Date)[] = [clientId, decodedTemplateName];
  
  if (startDate && endDate) {
    // Use date range that includes the full day
    // Cast created_at to date for comparison
    dateFilter = ' AND created_at::date >= $3::date AND created_at::date <= $4::date';
    queryParams.push(startDate, endDate);
  }

  try {
    // Get total count for this template (with date filter)
    const totalResult = await queryOne<{ total: string }>(`
      SELECT COUNT(*)::text as total
      FROM app.message_logs
      WHERE client_id = $1 AND template_name = $2${dateFilter}
    `, queryParams);

    const total = parseInt(totalResult?.total || '0');

    // Get all messages for this template (with date filter)
    const messages = await query<TemplateMessage>(`
      SELECT 
        id,
        name,
        phone,
        status_code,
        status_message,
        message_status,
        message_status_detailed,
        created_at,
        updated_at
      FROM app.message_logs
      WHERE client_id = $1 AND template_name = $2${dateFilter}
      ORDER BY created_at DESC
    `, queryParams);

    // Try to get dynamic metric stats (may fail if table doesn't exist)
    let metrics: Awaited<ReturnType<typeof getClientMetrics>> = [];
    let metricStats: Awaited<ReturnType<typeof getMetricStats>> = [];

    try {
      metrics = await getClientMetrics(clientId);
      if (metrics.length > 0) {
        metricStats = await getMetricStats(clientId, decodedTemplateName, startDate || undefined, endDate || undefined);
      }
    } catch (metricsError) {
      console.warn('Could not fetch metrics (table may not exist):', metricsError);
    }

    return NextResponse.json({
      templateName: decodedTemplateName,
      total,
      metrics,
      metricStats,
      messages,
    });
  } catch (error) {
    console.error('Failed to fetch template details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template details' },
      { status: 500 }
    );
  }
}
