import { NextResponse } from 'next/server';
import { getSession, getCurrentClient } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import type { MetricConfig } from '@/lib/types';

// GET - List all metrics for current client
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = await getCurrentClient();
    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }

    try {
      const metrics = await query<MetricConfig>(`
        SELECT 
          id, client_id, name, icon, color, 
          map_to_column, keywords, sort_order, 
          is_active, is_calculated, formula, prefix, unit, created_at, updated_at
        FROM app.client_metrics
        WHERE client_id = $1
        ORDER BY sort_order ASC, created_at ASC
      `, [clientId]);

      return NextResponse.json(metrics);
    } catch (dbError) {
      // Table might not exist yet - return empty array with a flag
      console.warn('client_metrics table may not exist:', dbError);
      return NextResponse.json({ 
        metrics: [], 
        tableNotFound: true,
        message: 'Metrics table not found. Please run the migration.'
      });
    }
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

// POST - Create a new metric
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = await getCurrentClient();
    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }

    const body = await request.json();
    const { name, icon, color, map_to_column, keywords, is_active = true, is_calculated = false, formula, prefix, unit } = body;

    // Validate required fields
    if (!name || !icon || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (is_calculated) {
      // Validate calculated metric
      if (!formula) {
        return NextResponse.json({ error: 'Formula is required for calculated metrics' }, { status: 400 });
      }
    } else {
      // Validate regular metric
      if (!map_to_column || !keywords) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      // Validate map_to_column - allow all columns from message_logs table
      const validColumns = ['message_status', 'status_code', 'status_message', 'message_status_detailed', 'template_name', 'name', 'phone', 'message_id'];
      if (!validColumns.includes(map_to_column)) {
        return NextResponse.json({ error: 'Invalid map_to_column value' }, { status: 400 });
      }
    }

    // Get the next sort order
    const maxOrder = await queryOne<{ max_order: number }>(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 as max_order
      FROM app.client_metrics
      WHERE client_id = $1
    `, [clientId]);

    const sortOrder = maxOrder?.max_order || 0;

    // Create the metric
    // Handle null values properly for calculated metrics
    const mapToColumnValue = is_calculated ? null : map_to_column;
    // For keywords array, use empty array for calculated metrics (PostgreSQL handles this better than null)
    const keywordsValue = is_calculated ? [] : keywords;
    const formulaValue = is_calculated ? formula : null;
    const prefixValue = is_calculated ? (prefix || null) : null;
    const unitValue = is_calculated ? (unit || null) : null;

    const metric = await queryOne<MetricConfig>(`
      INSERT INTO app.client_metrics (
        client_id, name, icon, color, map_to_column, keywords, sort_order, is_active, is_calculated, formula, prefix, unit
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [clientId, name, icon, color, mapToColumnValue, keywordsValue, sortOrder, is_active, is_calculated, formulaValue, prefixValue, unitValue]);

    if (!metric) {
      throw new Error('Failed to create metric');
    }

    return NextResponse.json(metric, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; detail?: string; constraint?: string };
    console.error('Error creating metric:', error);
    console.error('Error details:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      constraint: err?.constraint,
    });
    
    // Provide more detailed error message
    let message = 'Failed to create metric';
    if (err?.message?.includes('unique') || err?.constraint?.includes('name_unique')) {
      message = 'A metric with this name already exists';
    } else if (err?.message) {
      message = err.message;
    }
    
    return NextResponse.json({ 
      error: message,
      details: err?.detail || err?.message 
    }, { status: 500 });
  }
}

// PUT - Reorder metrics
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = await getCurrentClient();
    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }

    const body = await request.json();
    const { order } = body; // Array of { id, sort_order }

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'Invalid order format' }, { status: 400 });
    }

    // Update each metric's sort_order
    for (const item of order) {
      await query(`
        UPDATE app.client_metrics
        SET sort_order = $1
        WHERE id = $2 AND client_id = $3
      `, [item.sort_order, item.id, clientId]);
    }

    // Fetch updated metrics
    const metrics = await query<MetricConfig>(`
      SELECT 
        id, client_id, name, icon, color, 
        map_to_column, keywords, sort_order, 
        is_active, is_calculated, formula, prefix, unit, created_at, updated_at
      FROM app.client_metrics
      WHERE client_id = $1
      ORDER BY sort_order ASC
    `, [clientId]);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error reordering metrics:', error);
    return NextResponse.json({ error: 'Failed to reorder metrics' }, { status: 500 });
  }
}


