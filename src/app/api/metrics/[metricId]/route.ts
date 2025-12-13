import { NextResponse } from 'next/server';
import { getSession, getCurrentClient } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import type { MetricConfig } from '@/lib/types';

interface RouteParams {
  params: Promise<{ metricId: string }>;
}

// GET - Get a single metric
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = await getCurrentClient();
    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }

    const { metricId } = await params;

    const metric = await queryOne<MetricConfig>(`
      SELECT 
        id, client_id, name, icon, color, 
        map_to_column, keywords, sort_order, 
        is_active, created_at, updated_at
      FROM app.client_metrics
      WHERE id = $1 AND client_id = $2
    `, [metricId, clientId]);

    if (!metric) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    }

    return NextResponse.json(metric);
  } catch (error) {
    console.error('Error fetching metric:', error);
    return NextResponse.json({ error: 'Failed to fetch metric' }, { status: 500 });
  }
}

// PATCH - Update a metric
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = await getCurrentClient();
    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }

    const { metricId } = await params;
    const body = await request.json();

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(body.icon);
    }
    if (body.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(body.color);
    }
    if (body.is_calculated !== undefined) {
      updates.push(`is_calculated = $${paramIndex++}`);
      values.push(body.is_calculated);
    }
    if (body.formula !== undefined) {
      updates.push(`formula = $${paramIndex++}`);
      values.push(body.formula);
    }
    if (body.prefix !== undefined) {
      updates.push(`prefix = $${paramIndex++}`);
      values.push(body.prefix || null);
    }
    if (body.unit !== undefined) {
      updates.push(`unit = $${paramIndex++}`);
      values.push(body.unit || null);
    }
    if (body.map_to_column !== undefined) {
      if (body.map_to_column === null) {
        updates.push(`map_to_column = NULL`);
      } else {
        const validColumns = ['message_status', 'status_code', 'status_message', 'message_status_detailed', 'template_name', 'name', 'phone', 'message_id'];
        if (!validColumns.includes(body.map_to_column)) {
          return NextResponse.json({ error: 'Invalid map_to_column value' }, { status: 400 });
        }
        updates.push(`map_to_column = $${paramIndex++}`);
        values.push(body.map_to_column);
      }
    }
    if (body.keywords !== undefined) {
      if (body.keywords === null) {
        updates.push(`keywords = NULL`);
      } else {
        updates.push(`keywords = $${paramIndex++}`);
        values.push(body.keywords);
      }
    }
    if (body.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(body.sort_order);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(metricId, clientId);

    const metric = await queryOne<MetricConfig>(`
      UPDATE app.client_metrics
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND client_id = $${paramIndex}
      RETURNING *
    `, values);

    if (!metric) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    }

    return NextResponse.json(metric);
  } catch (error) {
    console.error('Error updating metric:', error);
    const message = error instanceof Error && error.message.includes('unique')
      ? 'A metric with this name already exists'
      : 'Failed to update metric';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete a metric
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = await getCurrentClient();
    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }

    const { metricId } = await params;

    const result = await query(`
      DELETE FROM app.client_metrics
      WHERE id = $1 AND client_id = $2
      RETURNING id
    `, [metricId, clientId]);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting metric:', error);
    return NextResponse.json({ error: 'Failed to delete metric' }, { status: 500 });
  }
}



