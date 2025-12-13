import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getClientMetrics, getMetricStats } from '@/lib/queries';

interface TemplateMessage {
  id: string;
  message_id: string | null;
  name: string | null;
  phone: string | null;
  status_code: number | null;
  status_message: string | null;
  message_status: string | null;
  message_status_detailed: string | null;
  created_at: Date;
  updated_at: Date;
}

interface FilterOption {
  value: string;
  count: number;
}

const ITEMS_PER_PAGE = 25;

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

  // Get query params
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const page = parseInt(searchParams.get('page') || '1');
  const searchColumn = searchParams.get('searchColumn');
  const searchQuery = searchParams.get('searchQuery');
  const statusCodeFilter = searchParams.get('statusCode');
  const statusMessageFilter = searchParams.get('statusMessage');
  const deliveryStatusFilter = searchParams.get('deliveryStatus');

  // Build base date filter clause
  let dateFilter = '';
  const baseParams: (string | Date)[] = [clientId, decodedTemplateName];
  let paramIndex = 3;
  
  if (startDate && endDate) {
    dateFilter = ` AND created_at::date >= $${paramIndex}::date AND created_at::date <= $${paramIndex + 1}::date`;
    baseParams.push(startDate, endDate);
    paramIndex += 2;
  }

  try {
    // Run all queries in parallel for speed
    const [totalResult, metricsResult, filterOptionsResult, messagesResult] = await Promise.all([
      // 1. Get total count (without filters for display)
      queryOne<{ total: string }>(`
        SELECT COUNT(*)::text as total
        FROM app.message_logs
        WHERE client_id = $1 AND template_name = $2${dateFilter}
      `, baseParams),

      // 2. Get metrics - this runs in parallel
      (async () => {
        try {
          const metrics = await getClientMetrics(clientId);
          if (metrics.length > 0) {
            const metricStats = await getMetricStats(clientId, decodedTemplateName, startDate || undefined, endDate || undefined);
            return { metrics, metricStats };
          }
          return { metrics: [], metricStats: [] };
        } catch {
          return { metrics: [], metricStats: [] };
        }
      })(),

      // 3. Get filter options (distinct values) - lightweight query
      (async () => {
        const [statusCodes, statusMessages, deliveryStatuses] = await Promise.all([
          query<{ value: string | null; count: string }>(`
            SELECT status_code::text as value, COUNT(*)::text as count
            FROM app.message_logs
            WHERE client_id = $1 AND template_name = $2${dateFilter}
            GROUP BY status_code
            ORDER BY status_code NULLS FIRST
          `, baseParams),
          query<{ value: string | null; count: string }>(`
            SELECT status_message as value, COUNT(*)::text as count
            FROM app.message_logs
            WHERE client_id = $1 AND template_name = $2${dateFilter}
            GROUP BY status_message
            ORDER BY status_message NULLS FIRST
          `, baseParams),
          query<{ value: string | null; count: string }>(`
            SELECT message_status as value, COUNT(*)::text as count
            FROM app.message_logs
            WHERE client_id = $1 AND template_name = $2${dateFilter}
            GROUP BY message_status
            ORDER BY message_status NULLS FIRST
          `, baseParams),
        ]);
        return { statusCodes, statusMessages, deliveryStatuses };
      })(),

      // 4. Get paginated messages with filters
      (async () => {
        // Build filter conditions
        let filterConditions = '';
        const filterParams = [...baseParams];
        let filterParamIndex = paramIndex;

        // Search filter
        if (searchColumn && searchQuery) {
          if (searchColumn === 'name') {
            filterConditions += ` AND LOWER(name) LIKE LOWER($${filterParamIndex})`;
          } else if (searchColumn === 'phone') {
            filterConditions += ` AND LOWER(phone) LIKE LOWER($${filterParamIndex})`;
          }
          filterParams.push(`%${searchQuery}%`);
          filterParamIndex++;
        }

        // Status code filter (comma-separated list)
        if (statusCodeFilter) {
          const codes = statusCodeFilter.split(',');
          const conditions: string[] = [];
          for (const code of codes) {
            if (code === '__null__') {
              conditions.push('status_code IS NULL');
            } else {
              conditions.push(`status_code = $${filterParamIndex}`);
              filterParams.push(code);
              filterParamIndex++;
            }
          }
          if (conditions.length > 0) {
            filterConditions += ` AND (${conditions.join(' OR ')})`;
          }
        }

        // Status message filter
        if (statusMessageFilter) {
          const messages = statusMessageFilter.split(',');
          const conditions: string[] = [];
          for (const msg of messages) {
            if (msg === '__null__') {
              conditions.push('status_message IS NULL');
            } else if (msg === '__empty__') {
              conditions.push("status_message = ''");
            } else {
              conditions.push(`status_message = $${filterParamIndex}`);
              filterParams.push(msg);
              filterParamIndex++;
            }
          }
          if (conditions.length > 0) {
            filterConditions += ` AND (${conditions.join(' OR ')})`;
          }
        }

        // Delivery status filter
        if (deliveryStatusFilter) {
          const statuses = deliveryStatusFilter.split(',');
          const conditions: string[] = [];
          for (const status of statuses) {
            if (status === '__null__') {
              conditions.push('message_status IS NULL');
            } else if (status === '__empty__') {
              conditions.push("message_status = ''");
            } else {
              conditions.push(`message_status = $${filterParamIndex}`);
              filterParams.push(status);
              filterParamIndex++;
            }
          }
          if (conditions.length > 0) {
            filterConditions += ` AND (${conditions.join(' OR ')})`;
          }
        }

        // Get filtered count
        const filteredCountResult = await queryOne<{ count: string }>(`
          SELECT COUNT(*)::text as count
          FROM app.message_logs
          WHERE client_id = $1 AND template_name = $2${dateFilter}${filterConditions}
        `, filterParams);

        const filteredCount = parseInt(filteredCountResult?.count || '0');

        // Get paginated messages
        const offset = (page - 1) * ITEMS_PER_PAGE;
        const messages = await query<TemplateMessage>(`
          SELECT 
            id,
            message_id,
            name,
            phone,
            status_code,
            status_message,
            message_status,
            message_status_detailed,
            created_at,
            updated_at
          FROM app.message_logs
          WHERE client_id = $1 AND template_name = $2${dateFilter}${filterConditions}
          ORDER BY created_at DESC
          LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
        `, filterParams);

        return { messages, filteredCount, page, totalPages: Math.ceil(filteredCount / ITEMS_PER_PAGE) };
      })(),
    ]);

    const total = parseInt(totalResult?.total || '0');

    return NextResponse.json({
      templateName: decodedTemplateName,
      total,
      metrics: metricsResult.metrics,
      metricStats: metricsResult.metricStats,
      // Filter options for dropdowns
      filterOptions: {
        statusCodes: filterOptionsResult.statusCodes.map(r => ({ 
          value: r.value, 
          count: parseInt(r.count) 
        })),
        statusMessages: filterOptionsResult.statusMessages.map(r => ({ 
          value: r.value, 
          count: parseInt(r.count) 
        })),
        deliveryStatuses: filterOptionsResult.deliveryStatuses.map(r => ({ 
          value: r.value, 
          count: parseInt(r.count) 
        })),
      },
      // Paginated messages
      messages: messagesResult.messages,
      filteredCount: messagesResult.filteredCount,
      page: messagesResult.page,
      totalPages: messagesResult.totalPages,
    });
  } catch (error) {
    console.error('Failed to fetch template details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template details' },
      { status: 500 }
    );
  }
}
