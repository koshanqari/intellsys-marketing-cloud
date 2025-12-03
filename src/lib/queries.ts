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
  const result = await queryOne<Client>(`
    INSERT INTO app.clients (name, email, phone, industry)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [data.name, data.email || null, data.phone || null, data.industry || null]);
  
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

  values.push(clientId);

  const result = await queryOne<Client>(`
    UPDATE app.clients
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

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
    total_messages: string;
    delivered: string;
    read: string;
    failed: string;
  }>(`
    SELECT 
      COUNT(*)::int as total_messages,
      COUNT(CASE WHEN message_status = 'delivered' OR message_status = 'read' THEN 1 END)::int as delivered,
      COUNT(CASE WHEN message_status = 'read' THEN 1 END)::int as read,
      COUNT(CASE WHEN status_code != 200 OR message_status IS NULL THEN 1 END)::int as failed
    FROM app.message_logs
    WHERE client_id = $1 ${dateFilter}
  `, params);

  const total = parseInt(result?.total_messages || '0');
  const delivered = parseInt(result?.delivered || '0');
  const read = parseInt(result?.read || '0');
  const failed = parseInt(result?.failed || '0');

  return {
    total_messages: total,
    delivered,
    read,
    failed,
    delivery_rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    read_rate: total > 0 ? Math.round((read / total) * 100) : 0,
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
