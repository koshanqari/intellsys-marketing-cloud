import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import type { Journey } from '@/lib/types';

// GET - Fetch a single journey
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  const adminSession = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!adminSession && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (adminSession) {
    clientId = await getCurrentClient();
  }

  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const { journeyId } = await params;

  try {
    const journey = await queryOne<Journey>(`
      SELECT *
      FROM app.journeys
      WHERE id = $1 AND client_id = $2
    `, [journeyId, clientId]);

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    return NextResponse.json(journey);
  } catch (error) {
    console.error('Failed to fetch journey:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journey' },
      { status: 500 }
    );
  }
}

// PATCH - Update a journey
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  const adminSession = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!adminSession && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (adminSession) {
    clientId = await getCurrentClient();
  }

  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const { journeyId } = await params;

  try {
    const body = await request.json();
    const { name, description, nodes, connections, canvas_state, status } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (nodes !== undefined) {
      updates.push(`nodes = $${paramIndex++}`);
      values.push(JSON.stringify(nodes));
    }
    if (connections !== undefined) {
      updates.push(`connections = $${paramIndex++}`);
      values.push(JSON.stringify(connections));
    }
    if (canvas_state !== undefined) {
      updates.push(`canvas_state = $${paramIndex++}`);
      values.push(JSON.stringify(canvas_state));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(journeyId, clientId);

    const journey = await queryOne<Journey>(`
      UPDATE app.journeys
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND client_id = $${paramIndex}
      RETURNING *
    `, values);

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    return NextResponse.json(journey);
  } catch (error) {
    console.error('Failed to update journey:', error);
    return NextResponse.json(
      { error: 'Failed to update journey' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a journey
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  const adminSession = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!adminSession && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (adminSession) {
    clientId = await getCurrentClient();
  }

  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const { journeyId } = await params;

  try {
    const result = await query(`
      DELETE FROM app.journeys
      WHERE id = $1 AND client_id = $2
      RETURNING id
    `, [journeyId, clientId]);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete journey:', error);
    return NextResponse.json(
      { error: 'Failed to delete journey' },
      { status: 500 }
    );
  }
}

