import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { getClientById } from '@/lib/queries';
import { query } from '@/lib/db';

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

interface TemplateSummary {
  total_contacts: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  http_success: number;
  failed: number;
  pending: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateName: string }> }
) {
  // Check for either super admin session or client user session
  const adminSession = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!adminSession && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get client ID - from client user session or from admin's selected client
  let clientId: string | null = null;
  
  if (clientUserSession) {
    // Client user - use their client_id
    clientId = clientUserSession.client_id;
  } else if (adminSession) {
    // Super admin - get selected client
    clientId = await getCurrentClient();
    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }
  }

  // Final check - clientId should never be null at this point, but TypeScript needs this
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { templateName } = await params;
  const decodedTemplateName = decodeURIComponent(templateName);
  
  // Get date filters from query params
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // Get client to access status_code_mappings and status_mappings
    const client = await getClientById(clientId);
    
    // Parse status_code_mappings if it's a string (in case of double-encoding)
    let statusCodeMappings: Record<string, string> = {};
    if (client?.status_code_mappings) {
      if (typeof client.status_code_mappings === 'string') {
        try {
          statusCodeMappings = JSON.parse(client.status_code_mappings);
        } catch {
          statusCodeMappings = {};
        }
      } else {
        statusCodeMappings = client.status_code_mappings as Record<string, string>;
      }
    }
    
    // Parse status_mappings if it's a string (in case of double-encoding)
    let statusMappings: Record<string, string> = {};
    if (client?.status_mappings) {
      if (typeof client.status_mappings === 'string') {
        try {
          statusMappings = JSON.parse(client.status_mappings);
        } catch {
          statusMappings = {};
        }
      } else {
        statusMappings = client.status_mappings as Record<string, string>;
      }
    }
    
    // Parse status_colors if it's a string (in case of double-encoding)
    let statusColors: Record<string, string> = {};
    if (client?.status_colors) {
      if (typeof client.status_colors === 'string') {
        try {
          statusColors = JSON.parse(client.status_colors);
        } catch {
          statusColors = {};
        }
      } else {
        statusColors = client.status_colors as Record<string, string>;
      }
    }
    
    // Helper function to get values from status mapping
    const getStatusValues = (mainStatus: string): string[] => {
      const mappingValue = statusMappings[mainStatus];
      if (mappingValue && typeof mappingValue === 'string' && mappingValue.trim()) {
        return mappingValue.split(',').map(v => v.trim()).filter(Boolean);
      }
      // Default fallback for backwards compatibility
      const defaults: Record<string, string[]> = {
        SENT: ['sent', 'Sent', 'SENT'],
        DELIVERED: ['delivered', 'Delivered', 'DELIVERED'],
        READ: ['read', 'Read', 'READ'],
        REPLIED: ['replied', 'Replied', 'REPLIED'],
        FAILED: ['failed', 'Failed', 'FAILED']
      };
      return defaults[mainStatus] || [];
    };
    
    // Build SQL condition for HTTP success codes
    // Default: 200-299 range if no mapping exists
    let httpSuccessCondition = "status_code >= 200 AND status_code < 300";
    let successCodes: number[] = [];
    let paramOffset = 2; // $1 = clientId, $2 = templateName
    
    if (statusCodeMappings.SUCCESS && typeof statusCodeMappings.SUCCESS === 'string') {
      successCodes = statusCodeMappings.SUCCESS.split(',')
        .map(code => parseInt(code.trim()))
        .filter(code => !isNaN(code));
      
      if (successCodes.length > 0) {
        const placeholders = successCodes.map((_, i) => `$${paramOffset + i + 1}`).join(', ');
        httpSuccessCondition = `status_code IN (${placeholders})`;
        paramOffset += successCodes.length;
      }
    }
    
    // Build status conditions using mappings
    const sentValues = getStatusValues('SENT');
    const deliveredValues = getStatusValues('DELIVERED');
    const readValues = getStatusValues('READ');
    const repliedValues = getStatusValues('REPLIED');
    const failedValues = getStatusValues('FAILED');
    
    // Build parameterized conditions
    const buildStatusCondition = (values: string[], offset: number): { condition: string; params: string[] } => {
      if (values.length === 0) {
        return { condition: 'FALSE', params: [] };
      }
      const params: string[] = [];
      const conditions: string[] = [];
      
      // Add exact match conditions
      if (values.length > 0) {
        const exactPlaceholders = values.map((_, i) => `$${offset + i + 1}`);
        conditions.push(`message_status IN (${exactPlaceholders.join(', ')})`);
        params.push(...values);
        offset += values.length;
      }
      
      // Add case-insensitive conditions
      if (values.length > 0) {
        const lowerPlaceholders = values.map((_, i) => `$${offset + i + 1}`);
        conditions.push(`LOWER(message_status) IN (${lowerPlaceholders.join(', ')})`);
        params.push(...values.map(v => v.toLowerCase()));
      }
      
      return {
        condition: `(${conditions.join(' OR ')})`,
        params
      };
    };
    
    let currentOffset = paramOffset;
    const sentCond = buildStatusCondition(sentValues, currentOffset);
    currentOffset += sentCond.params.length;
    
    const deliveredCond = buildStatusCondition(deliveredValues, currentOffset);
    currentOffset += deliveredCond.params.length;
    
    const readCond = buildStatusCondition(readValues, currentOffset);
    currentOffset += readCond.params.length;
    
    const repliedCond = buildStatusCondition(repliedValues, currentOffset);
    currentOffset += repliedCond.params.length;
    
    const failedCond = buildStatusCondition(failedValues, currentOffset);
    
    // Get summary stats for this template
    const queryParams: (string | number)[] = [
      clientId, 
      decodedTemplateName, 
      ...successCodes,
      ...sentCond.params,
      ...deliveredCond.params,
      ...readCond.params,
      ...repliedCond.params,
      ...failedCond.params
    ];
    
    // Build date filter for WHERE clause
    let dateFilter = '';
    let dateParamIndex = queryParams.length + 1;
    if (startDate) {
      dateFilter += ` AND created_at >= $${dateParamIndex++}`;
      queryParams.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND created_at <= $${dateParamIndex++}`;
      const endDateWithTime = new Date(endDate);
      endDateWithTime.setHours(23, 59, 59, 999);
      queryParams.push(endDateWithTime.toISOString());
    }
    
    const summaryResult = await query<{
      total_contacts: string;
      sent: string;
      delivered: string;
      read: string;
      replied: string;
      http_success: string;
      failed: string;
      pending: string;
    }>(`
      SELECT 
        COUNT(*)::int as total_contacts,
        COUNT(CASE 
          WHEN ${sentCond.condition} OR ${deliveredCond.condition} OR ${readCond.condition} OR ${repliedCond.condition}
          THEN 1 
        END)::int as sent,
        COUNT(CASE 
          WHEN ${deliveredCond.condition}
          THEN 1 
        END)::int as delivered,
        COUNT(CASE 
          WHEN ${readCond.condition}
          THEN 1 
        END)::int as read,
        COUNT(CASE 
          WHEN ${repliedCond.condition}
          THEN 1 
        END)::int as replied,
        COUNT(CASE 
          WHEN ${httpSuccessCondition}
          THEN 1 
        END)::int as http_success,
        COUNT(CASE 
          WHEN ${failedCond.condition}
          THEN 1 
        END)::int as failed,
        COUNT(CASE 
          WHEN message_status IS NULL
          THEN 1 
        END)::int as pending
      FROM app.message_logs
      WHERE client_id = $1 AND template_name = $2 ${dateFilter}
    `, queryParams);

    const summary: TemplateSummary = {
      total_contacts: parseInt(summaryResult[0]?.total_contacts || '0'),
      sent: parseInt(summaryResult[0]?.sent || '0'),
      delivered: parseInt(summaryResult[0]?.delivered || '0'),
      read: parseInt(summaryResult[0]?.read || '0'),
      replied: parseInt(summaryResult[0]?.replied || '0'),
      http_success: parseInt(summaryResult[0]?.http_success || '0'),
      failed: parseInt(summaryResult[0]?.failed || '0'),
      pending: parseInt(summaryResult[0]?.pending || '0'),
    };

    // Get all messages for this template (with date filter)
    const messageParams: (string | number)[] = [clientId, decodedTemplateName];
    let messageDateFilter = '';
    let messageDateParamIndex = 3;
    if (startDate) {
      messageDateFilter += ` AND created_at >= $${messageDateParamIndex++}`;
      messageParams.push(startDate);
    }
    if (endDate) {
      messageDateFilter += ` AND created_at <= $${messageDateParamIndex++}`;
      const endDateWithTime = new Date(endDate);
      endDateWithTime.setHours(23, 59, 59, 999);
      messageParams.push(endDateWithTime.toISOString());
    }
    
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
      WHERE client_id = $1 AND template_name = $2 ${messageDateFilter}
      ORDER BY created_at DESC
    `, messageParams);

    // Ensure statusColors is a plain object (not a JSONB object with special properties)
    const plainStatusColors: Record<string, string> = {};
    if (statusColors && typeof statusColors === 'object') {
      Object.keys(statusColors).forEach(key => {
        plainStatusColors[key] = String(statusColors[key]);
      });
    }
    
    console.log('API returning statusColors:', plainStatusColors);
    console.log('API returning REPLIED color:', plainStatusColors['REPLIED']);
    
    return NextResponse.json({
      templateName: decodedTemplateName,
      summary,
      messages,
      statusCodeMappings,
      statusMappings,
      statusColors: plainStatusColors,
    });
  } catch (error) {
    console.error('Failed to fetch template details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template details' },
      { status: 500 }
    );
  }
}
