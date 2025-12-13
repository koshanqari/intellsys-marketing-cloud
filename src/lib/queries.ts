import { query, queryOne } from './db';
import type { Client, TemplateStats, DailyStats, StatusDistribution, AnalyticsSummary } from './types';

// Client queries - Lightweight query for listing (no message counts)
export async function getClientsFromTable(): Promise<Client[]> {
  return query<Client>(`
    SELECT 
      id,
      name,
      email,
      phone,
      industry,
      logo_url,
      whatsapp_enabled,
      sms_enabled,
      email_enabled,
      status,
      created_at,
      updated_at,
      0 as total_messages
    FROM app.clients
    WHERE status = 'active'
    ORDER BY name ASC
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
      COUNT(CASE WHEN message_status IN ('sent', 'delivered', 'read', 'button', 'text') OR (status_code = 200 AND message_status IS NULL) THEN 1 END)::int as sent,
      COUNT(CASE WHEN message_status IN ('delivered', 'read', 'button', 'text') THEN 1 END)::int as delivered,
      COUNT(CASE WHEN message_status = 'read' THEN 1 END)::int as read,
      COUNT(CASE WHEN message_status IN ('button', 'text') THEN 1 END)::int as replied,
      COUNT(CASE WHEN status_code != 200 THEN 1 END)::int as failed,
      COUNT(CASE WHEN message_status IS NULL AND status_code = 200 THEN 1 END)::int as pending
    FROM app.message_logs
    WHERE client_id = $1 ${dateFilter}
  `, params);

  const totalMessages = parseInt(result?.total_contacts || '0');
  const delivered = parseInt(result?.delivered || '0');
  const read = parseInt(result?.read || '0');
  const failed = parseInt(result?.failed || '0');
  
  return {
    total_messages: totalMessages,
    delivered,
    read,
    failed,
    delivery_rate: totalMessages > 0 ? (delivered / totalMessages) * 100 : 0,
    read_rate: totalMessages > 0 ? (read / totalMessages) * 100 : 0,
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

// Metric Configuration queries
import type { MetricConfig, DynamicMetricStat } from './types';

export async function getClientMetrics(clientId: string): Promise<MetricConfig[]> {
  try {
    return await query<MetricConfig>(`
      SELECT 
        id, client_id, name, icon, color, 
        map_to_column, keywords, sort_order, 
        is_active, is_calculated, formula, prefix, unit, created_at, updated_at
      FROM app.client_metrics
      WHERE client_id = $1 AND is_active = true
      ORDER BY sort_order ASC
    `, [clientId]);
  } catch (error) {
    // Table might not exist yet - return empty array
    console.warn('client_metrics table may not exist:', error);
    return [];
  }
}

export async function getMetricStats(
  clientId: string, 
  templateName?: string,
  startDate?: string, 
  endDate?: string
): Promise<DynamicMetricStat[]> {
  // First, get the client's active metrics
  const metrics = await getClientMetrics(clientId);
  
  if (metrics.length === 0) {
    return [];
  }

  // Separate regular and calculated metrics
  const regularMetrics = metrics.filter(m => !m.is_calculated);
  const calculatedMetrics = metrics.filter(m => m.is_calculated && m.is_active);

  const results: DynamicMetricStat[] = [];
  
  // Build base filters
  let baseFilter = 'WHERE client_id = $1';
  const baseParams: unknown[] = [clientId];
  let paramIndex = 2;

  if (templateName) {
    baseFilter += ` AND template_name = $${paramIndex++}`;
    baseParams.push(templateName);
  }

  if (startDate && endDate) {
    // Use date comparison to match the template API route format
    baseFilter += ` AND created_at::date >= $${paramIndex++}::date AND created_at::date <= $${paramIndex++}::date`;
    baseParams.push(startDate, endDate);
  }

  // Get total count for percentage calculation
  const totalResult = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text as count
    FROM app.message_logs
    ${baseFilter}
  `, baseParams);
  
  const totalCount = parseInt(totalResult?.count || '0');

  // Helper to escape SQL strings (escape single quotes)
  const escapeSqlString = (str: string): string => {
    return str.replace(/'/g, "''");
  };

  // Helper to format calculated metric result (up to 2 decimal places, or zero if whole number)
  const formatCalculatedValue = (value: number): number => {
    if (Number.isInteger(value)) {
      return value;
    }
    // Round to 2 decimal places
    return Math.round(value * 100) / 100;
  };

  // Helper to evaluate formula - supports JavaScript expressions with Math functions
  const evaluateFormula = (formula: string, metricValues: Map<string, number>): number => {
    try {
      // Preserve Math functions by temporarily replacing them, then restore after metric replacement
      const mathPlaceholders = new Map<string, string>();
      let placeholderIndex = 0;
      let expression = formula;
      
      // Replace Math functions with placeholders to protect them
      expression = expression.replace(/\bMath\.\w+/gi, (match) => {
        const placeholder = `__MATH_${placeholderIndex++}__`;
        mathPlaceholders.set(placeholder, match);
        return placeholder;
      });
      
      // Now normalize metric names (case-insensitive, remove spaces)
      // Sort by length (longest first) to avoid partial matches
      const sortedEntries = Array.from(metricValues.entries()).sort((a, b) => b[0].length - a[0].length);
      
      for (const [metricName, value] of sortedEntries) {
        // Normalized metric name (already normalized when stored in map)
        const normalizedName = metricName;
        // Create regex to match the metric name as a whole word (case-insensitive)
        // This ensures we don't match partial words like "delivered" in "undelivered"
        const regex = new RegExp(`\\b${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        expression = expression.replace(regex, value.toString());
      }
      
      // Restore Math functions
      for (const [placeholder, mathFunc] of mathPlaceholders.entries()) {
        expression = expression.replace(placeholder, mathFunc);
      }
      
      // Validate: Check for potentially dangerous patterns in original formula
      const dangerousPatterns = [
        /eval\s*\(/i,
        /function\s*\(/i,
        /=>/,
        /import\s+/i,
        /require\s*\(/i,
        /process\./i,
        /global\./i,
        /window\./i,
        /document\./i,
        /__proto__/i,
        /constructor\./i,
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(formula)) {
          console.error('Potentially dangerous pattern detected in formula:', formula);
          return 0;
        }
      }
      
      // Final validation: ensure expression looks like a valid math expression
      // This is a basic check - the safe evaluation context will prevent actual code execution
      // Allow: numbers, operators, Math functions, parentheses, and whitespace
      if (!/^[\d+\-*/().\sMath\.a-z()]+$/i.test(expression)) {
        console.error('Invalid characters in formula expression:', expression, 'Original:', formula);
        return 0;
      }
      
      // Create a safe evaluation context with only Math functions
      const safeMath = {
        Math: {
          round: Math.round,
          floor: Math.floor,
          ceil: Math.ceil,
          abs: Math.abs,
          max: Math.max,
          min: Math.min,
          sqrt: Math.sqrt,
          pow: Math.pow,
          exp: Math.exp,
          log: Math.log,
          log10: Math.log10,
          sin: Math.sin,
          cos: Math.cos,
          tan: Math.tan,
          PI: Math.PI,
          E: Math.E,
        },
      };
      
      // Use Function constructor with safe context
      const result = Function('Math', `"use strict"; return (${expression})`)(safeMath.Math);
      const numResult = Number(result);
      
      if (!isFinite(numResult)) {
        console.error('Formula result is not a finite number:', numResult, 'Formula:', formula);
        return 0;
      }
      
      return formatCalculatedValue(numResult);
    } catch (error) {
      console.error('Error evaluating formula:', formula, error);
      return 0;
    }
  };

  // Calculate count for each regular metric first
  const metricValues = new Map<string, number>();
  
  for (const metric of regularMetrics) {
    if (!metric.is_active) continue;
    
    let count = 0;

    if (!metric.keywords || metric.keywords.length === 0) {
      continue;
    }

    // Build the condition based on map_to_column
    const column = metric.map_to_column;
    if (!column) continue; // Skip if no column (shouldn't happen for regular metrics)
    
    const keywordConditions: string[] = [];
    let hasWildcard = false;
    
    for (const keyword of metric.keywords || []) {
      const keywordLower = keyword.toLowerCase();
      
      // Check for wildcard - matches all rows (COUNT(*))
      if (keyword === '*') {
        hasWildcard = true;
        break; // If wildcard, no need for other conditions
      } else if (keyword === '$not_null') {
        // Special case for non-null values - works for all column types
        keywordConditions.push(`${column} IS NOT NULL`);
      } else if (keyword === '$null' || keywordLower === 'null') {
        // Special case for null values (support both $null and null for backward compatibility)
        keywordConditions.push(`${column} IS NULL`);
      } else if (keyword === '$empty') {
        // Special case for empty strings/values - works for all column types
        if (column === 'status_code') {
          // For status_code (integer), empty could mean 0 or we skip it
          // You could also use: keywordConditions.push(`${column} = 0`);
          // For now, we'll match empty string in text representation
          keywordConditions.push(`${column}::text = ''`);
        } else {
          // For text columns, match empty string
          keywordConditions.push(`${column} = ''`);
        }
      } else if (column === 'status_code') {
        // For status_code, match as integer (convert to text for comparison)
        // Escape the keyword to prevent SQL injection
        const escapedKeyword = escapeSqlString(keyword);
        keywordConditions.push(`${column}::text = '${escapedKeyword}'`);
      } else {
        // For text columns, match case-insensitively
        // Escape the keyword to prevent SQL injection and preserve spaces
        const escapedKeyword = escapeSqlString(keyword);
        keywordConditions.push(`LOWER(${column}) = LOWER('${escapedKeyword}')`);
      }
    }

    // If wildcard, count all rows (COUNT(*))
    if (hasWildcard) {
      const countResult = await queryOne<{ count: string }>(`
        SELECT COUNT(*)::text as count
        FROM app.message_logs
        ${baseFilter}
      `, baseParams);
      count = parseInt(countResult?.count || '0');
    } else if (keywordConditions.length > 0) {
      const countResult = await queryOne<{ count: string }>(`
        SELECT COUNT(*)::text as count
        FROM app.message_logs
        ${baseFilter}
        AND (${keywordConditions.join(' OR ')})
      `, baseParams);
      count = parseInt(countResult?.count || '0');
    }

    // Store value for calculated metrics to use
    const normalizedName = metric.name.toLowerCase().replace(/\s+/g, '');
    metricValues.set(normalizedName, count);
    
    results.push({
      metric_id: metric.id,
      name: metric.name,
      icon: metric.icon,
      color: metric.color,
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      is_calculated: false,
      prefix: null,
      unit: null,
    });
  }

  // Now evaluate calculated metrics
  for (const calcMetric of calculatedMetrics) {
    if (!calcMetric.formula) continue;
    
    const calculatedValue = evaluateFormula(calcMetric.formula, metricValues);
    
    results.push({
      metric_id: calcMetric.id,
      name: calcMetric.name,
      icon: calcMetric.icon,
      color: calcMetric.color,
      count: calculatedValue,
      is_calculated: true,
      prefix: calcMetric.prefix,
      unit: calcMetric.unit,
    });
  }

  return results;
}

// Get template stats using dynamic metrics
export async function getTemplateStatsWithMetrics(
  clientId: string, 
  startDate?: string, 
  endDate?: string
): Promise<{
  template_name: string;
  total: number;
  metrics: DynamicMetricStat[];
}[]> {
  let dateFilter = '';
  const params: unknown[] = [clientId];
  
  if (startDate && endDate) {
    dateFilter = 'AND created_at >= $2 AND created_at <= $3';
    params.push(startDate, endDate);
  }

  // Get all templates with their total counts
  const templates = await query<{ template_name: string; total: string }>(`
    SELECT 
      COALESCE(template_name, 'Unknown') as template_name,
      COUNT(*)::text as total
    FROM app.message_logs
    WHERE client_id = $1 ${dateFilter}
    GROUP BY template_name
    ORDER BY COUNT(*) DESC
  `, params);

  // Get metrics for each template
  const results = [];
  for (const template of templates) {
    const metrics = await getMetricStats(clientId, template.template_name, startDate, endDate);
    results.push({
      template_name: template.template_name,
      total: parseInt(template.total),
      metrics,
    });
  }

  return results;
}
