import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import type { Journey } from '@/lib/types';

// GET - List all journeys for the current client
export async function GET() {
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

  try {
    const journeys = await query<Journey>(`
      SELECT id, client_id, name, description, status, created_by, created_at, updated_at
      FROM app.journeys
      WHERE client_id = $1
      ORDER BY updated_at DESC
    `, [clientId]);

    return NextResponse.json(journeys);
  } catch (error) {
    console.error('Failed to fetch journeys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journeys' },
      { status: 500 }
    );
  }
}

// POST - Create a new journey
export async function POST(request: NextRequest) {
  const adminSession = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!adminSession && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let clientId: string | null = null;
  let userId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
    userId = clientUserSession.id;
  } else if (adminSession) {
    clientId = await getCurrentClient();
  }

  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const journey = await queryOne<Journey>(`
      INSERT INTO app.journeys (client_id, name, description, created_by, nodes, connections, canvas_state)
      VALUES ($1, $2, $3, $4, '[]'::jsonb, '[]'::jsonb, '{"zoom": 1, "panX": 0, "panY": 0}'::jsonb)
      RETURNING *
    `, [clientId, name, description || null, userId]);

    return NextResponse.json(journey);
  } catch (error) {
    console.error('Failed to create journey:', error);
    return NextResponse.json(
      { error: 'Failed to create journey' },
      { status: 500 }
    );
  }
}

