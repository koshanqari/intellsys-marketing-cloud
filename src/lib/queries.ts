import { query, queryOne } from './db';
import type { Client, TemplateStats, DailyStats, StatusDistribution, AnalyticsSummary } from './types';

// Client queries
export async function getClientsFromTable(): Promise<Client[]> {
  return query<Client>(`
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.industry,
      c.logo_url,
      c.whatsapp_enabled,
      c.sms_enabled,
      c.email_enabled,
      c.status,
      COALESCE(c.status_mappings, '{}'::jsonb) as status_mappings,
      COALESCE(c.status_code_mappings, '{}'::jsonb) as status_code_mappings,
      COALESCE(c.status_colors, '{}'::jsonb) as status_colors,
      c.created_at,
      c.updated_at,
      COALESCE(m.total_messages, 0)::int as total_messages
    FROM app.clients c
    LEFT JOIN (
      SELECT client_id, COUNT(*) as total_messages
      FROM app.message_logs
      GROUP BY client_id
    ) m ON c.id = m.client_id
    WHERE c.status = 'active'
    ORDER BY c.name ASC
  `);
}

export async function getClientById(clientId: string): Promise<Client | null> {
  return queryOne<Client>(`
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.industry,
      c.logo_url,
      c.whatsapp_enabled,
      c.sms_enabled,
      c.email_enabled,
      c.status,
      COALESCE(c.status_mappings, '{}'::jsonb) as status_mappings,
      COALESCE(c.status_code_mappings, '{}'::jsonb) as status_code_mappings,
      COALESCE(c.status_colors, '{}'::jsonb) as status_colors,
      c.created_at,
      c.updated_at,
      COALESCE(m.total_messages, 0)::int as total_messages
    FROM app.clients c
    LEFT JOIN (
      SELECT client_id, COUNT(*) as total_messages
      FROM app.message_logs
      GROUP BY client_id
    ) m ON c.id = m.client_id
    WHERE c.id = $1
  `, [clientId]);
}

export async function createClient(data: {
  name: string;
  email?: string;
  phone?: string;
  industry?: string;
}): Promise<Client> {
  // Default status mappings
  const defaultStatusMappings = {
    SENT: 'sent,Sent,SENT',
    DELIVERED: 'delivered,Delivered,DELIVERED',
    READ: 'read,Read,READ',
    REPLIED: 'replied,Replied,REPLIED',
    FAILED: 'failed,Failed,FAILED',
    PENDING: '', // Pending is for messages with no status (NULL), so no mapping needed
  };

  // Default status code mappings
  const defaultStatusCodeMappings = {
    SUCCESS: '200,201,202',
    CLIENT_ERROR: '400,401,403,404',
    SERVER_ERROR: '500,502,503',
  };

  const result = await queryOne<Client>(`
    INSERT INTO app.clients (name, email, phone, industry, status_mappings, status_code_mappings)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
    RETURNING 
      id, name, email, phone, industry, logo_url,
      whatsapp_enabled, sms_enabled, email_enabled, status,
      COALESCE(status_mappings, '{}'::jsonb) as status_mappings,
      COALESCE(status_code_mappings, '{}'::jsonb) as status_code_mappings,
      created_at, updated_at
  `, [
    data.name, 
    data.email || null, 
    data.phone || null, 
    data.industry || null,
    JSON.stringify(defaultStatusMappings),
    JSON.stringify(defaultStatusCodeMappings),
  ]);

  if (!result) throw new Error('Failed to create client');
  return result;
}

export async function updateClient(clientId: string, data: {
  name?: string;
  email?: string;
  phone?: string;
  industry?: string;
  logo_url?: string;
  whatsapp_enabled?: boolean;
  sms_enabled?: boolean;
  email_enabled?: boolean;
  status?: string;
  status_mappings?: Record<string, string> | null;
  status_code_mappings?: Record<string, string> | null;
  status_colors?: Record<string, string> | null;
}): Promise<Client> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(data.email || null);
  }
  if (data.phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(data.phone || null);
  }
  if (data.industry !== undefined) {
    updates.push(`industry = $${paramIndex++}`);
    values.push(data.industry || null);
  }
  if (data.logo_url !== undefined) {
    updates.push(`logo_url = $${paramIndex++}`);
    values.push(data.logo_url || null);
  }
  if (data.whatsapp_enabled !== undefined) {
    updates.push(`whatsapp_enabled = $${paramIndex++}`);
    values.push(data.whatsapp_enabled);
  }
  if (data.sms_enabled !== undefined) {
    updates.push(`sms_enabled = $${paramIndex++}`);
    values.push(data.sms_enabled);
  }
  if (data.email_enabled !== undefined) {
    updates.push(`email_enabled = $${paramIndex++}`);
    values.push(data.email_enabled);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.status_mappings !== undefined) {
    updates.push(`status_mappings = $${paramIndex++}`);
    values.push(data.status_mappings ? JSON.stringify(data.status_mappings) : '{}');
  }
  if (data.status_code_mappings !== undefined) {
    updates.push(`status_code_mappings = $${paramIndex++}`);
    values.push(data.status_code_mappings ? JSON.stringify(data.status_code_mappings) : '{}');
  }
  if (data.status_colors !== undefined) {
    updates.push(`status_colors = $${paramIndex++}`);
    values.push(data.status_colors ? JSON.stringify(data.status_colors) : '{}');
  }

  values.push(clientId);

  const result = await queryOne<Client>(`
    UPDATE app.clients
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, name, email, phone, industry, logo_url,
      whatsapp_enabled, sms_enabled, email_enabled, status,
      COALESCE(status_mappings, '{}'::jsonb) as status_mappings,
      COALESCE(status_code_mappings, '{}'::jsonb) as status_code_mappings,
      COALESCE(status_colors, '{}'::jsonb) as status_colors,
      created_at, updated_at
  `, values);
  
  // Ensure status_colors is properly parsed
  if (result && result.status_colors && typeof result.status_colors === 'string') {
    try {
      result.status_colors = JSON.parse(result.status_colors);
    } catch {
      result.status_colors = {};
    }
  }

  if (!result) throw new Error('Failed to update client');
  return result;
}

export async function getAnalyticsSummary(clientId: string, startDate?: string, endDate?: string): Promise<AnalyticsSummary> {
  let dateFilter = '';
  const params: unknown[] = [clientId];
  
  if (startDate && endDate) {
    dateFilter = 'AND created_at >= $2 AND created_at <= $3';
    params.push(startDate, endDate);
  }

  const result = await queryOne<{
    total_contacts: string;
    sent: string;
    delivered: string;
    read: string;
    replied: string;
    failed: string;
    pending: string;
  }>(`
    SELECT 
      COUNT(*)::int as total_contacts,
      COUNT(CASE 
        WHEN LOWER(message_status) IN ('sent', 'delivered', 'read', 'replied') 
        OR message_status IN ('sent', 'delivered', 'read', 'replied')
        THEN 1 
      END)::int as sent,
      COUNT(CASE 
        WHEN LOWER(message_status) = 'delivered' OR message_status = 'delivered'
        THEN 1 
      END)::int as delivered,
      COUNT(CASE 
        WHEN LOWER(message_status) = 'read' OR message_status = 'read'
        THEN 1 
      END)::int as read,
      COUNT(CASE 
        WHEN LOWER(message_status) = 'replied' OR message_status = 'replied'
        THEN 1 
      END)::int as replied,
      COUNT(CASE 
        WHEN LOWER(message_status) = 'failed' OR message_status = 'failed'
        THEN 1 
      END)::int as failed,
      COUNT(CASE 
        WHEN message_status IS NULL
        THEN 1 
      END)::int as pending
    FROM app.message_logs
    WHERE client_id = $1 ${dateFilter}
  `, params);

  return {
    total_contacts: parseInt(result?.total_contacts || '0'),
    sent: parseInt(result?.sent || '0'),
    delivered: parseInt(result?.delivered || '0'),
    read: parseInt(result?.read || '0'),
    replied: parseInt(result?.replied || '0'),
    failed: parseInt(result?.failed || '0'),
    pending: parseInt(result?.pending || '0'),
  };
}

export async function getTemplateStats(clientId: string, startDate?: string, endDate?: string): Promise<TemplateStats[]> {
  let dateFilter = '';
  const params: unknown[] = [clientId];
  
  if (startDate && endDate) {
    dateFilter = 'AND created_at >= $2 AND created_at <= $3';
    params.push(startDate, endDate);
  }

  return query<TemplateStats>(`
    SELECT 
      COALESCE(template_name, 'Unknown') as template_name,
      COUNT(*)::int as total,
      COUNT(CASE WHEN message_status = 'delivered' OR message_status = 'read' THEN 1 END)::int as delivered,
      COUNT(CASE WHEN message_status = 'read' THEN 1 END)::int as read,
      COUNT(CASE WHEN status_code != 200 THEN 1 END)::int as failed
    FROM app.message_logs
    WHERE client_id = $1 ${dateFilter}
    GROUP BY template_name
    ORDER BY total DESC
  `, params);
}

export async function getDailyStats(clientId: string, startDate?: string, endDate?: string): Promise<DailyStats[]> {
  let dateFilter = '';
  const params: unknown[] = [clientId];
  
  if (startDate && endDate) {
    dateFilter = 'AND created_at >= $2 AND created_at <= $3';
    params.push(startDate, endDate);
  }

  return query<DailyStats>(`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM-DD') as date,
      COUNT(*)::int as total,
      COUNT(CASE WHEN message_status = 'delivered' OR message_status = 'read' THEN 1 END)::int as delivered,
      COUNT(CASE WHEN message_status = 'read' THEN 1 END)::int as read
    FROM app.message_logs
    WHERE client_id = $1 ${dateFilter}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date ASC
  `, params);
}

export async function getStatusDistribution(clientId: string, startDate?: string, endDate?: string): Promise<StatusDistribution[]> {
  let dateFilter = '';
  const params: unknown[] = [clientId];
  
  if (startDate && endDate) {
    dateFilter = 'AND created_at >= $2 AND created_at <= $3';
    params.push(startDate, endDate);
  }

  return query<StatusDistribution>(`
    SELECT 
      COALESCE(message_status, 'pending') as status,
      COUNT(*)::int as count
    FROM app.message_logs
    WHERE client_id = $1 ${dateFilter}
    GROUP BY message_status
    ORDER BY count DESC
  `, params);
}

export async function getTemplateNames(clientId: string): Promise<string[]> {
  const result = await query<{ template_name: string }>(`
    SELECT DISTINCT template_name
    FROM app.message_logs
    WHERE client_id = $1 AND template_name IS NOT NULL
    ORDER BY template_name
  `, [clientId]);
  
  return result.map(r => r.template_name);
}
