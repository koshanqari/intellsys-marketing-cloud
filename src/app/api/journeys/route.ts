import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import type { Journey } from '@/lib/types';

// Check if group_id column exists in journeys table (for backwards compatibility)
async function checkGroupIdColumnExists(): Promise<boolean> {
  try {
    const result = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'app' 
        AND table_name = 'journeys' 
        AND column_name = 'group_id'
      ) as exists
    `);
    return result?.exists || false;
  } catch {
    return false;
  }
}

// GET - List all journeys for the current client
export async function GET(request: NextRequest) {
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

  // Get optional group_id filter
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('group_id');
  const all = searchParams.get('all'); // If 'all=true', return all journeys regardless of group

  try {
    let journeys: Journey[];
    
    // Check if group_id column exists (backwards compatibility)
    const hasGroupIdColumn = await checkGroupIdColumnExists();
    
    if (all === 'true') {
      // Return all journeys (for journey selection dropdowns)
      journeys = await query<Journey>(`
        SELECT id, client_id, name, description, ${hasGroupIdColumn ? 'group_id,' : 'NULL as group_id,'} status, created_by, created_at, updated_at
        FROM app.journeys
        WHERE client_id = $1
        ORDER BY name ASC
      `, [clientId]);
    } else if (!hasGroupIdColumn || groupId === 'null' || groupId === '') {
      // Get root level journeys (or all if group_id doesn't exist)
      if (hasGroupIdColumn) {
        journeys = await query<Journey>(`
          SELECT id, client_id, name, description, group_id, status, created_by, created_at, updated_at
          FROM app.journeys
          WHERE client_id = $1 AND (group_id IS NULL)
          ORDER BY updated_at DESC
        `, [clientId]);
      } else {
        // group_id column doesn't exist yet - return all journeys
        journeys = await query<Journey>(`
          SELECT id, client_id, name, description, NULL as group_id, status, created_by, created_at, updated_at
          FROM app.journeys
          WHERE client_id = $1
          ORDER BY updated_at DESC
        `, [clientId]);
      }
    } else if (groupId) {
      // Get journeys in a specific group
      journeys = await query<Journey>(`
        SELECT id, client_id, name, description, group_id, status, created_by, created_at, updated_at
        FROM app.journeys
        WHERE client_id = $1 AND group_id = $2
        ORDER BY updated_at DESC
      `, [clientId, groupId]);
    } else {
      // Default: get all journeys at root level
      if (hasGroupIdColumn) {
        journeys = await query<Journey>(`
          SELECT id, client_id, name, description, group_id, status, created_by, created_at, updated_at
          FROM app.journeys
          WHERE client_id = $1 AND (group_id IS NULL)
          ORDER BY updated_at DESC
        `, [clientId]);
      } else {
        journeys = await query<Journey>(`
          SELECT id, client_id, name, description, NULL as group_id, status, created_by, created_at, updated_at
          FROM app.journeys
          WHERE client_id = $1
          ORDER BY updated_at DESC
        `, [clientId]);
      }
    }

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

  // RBAC: Check if client user has edit permission
  if (clientUserSession && !clientUserSession.permissions?.journey_builder_edit) {
    return NextResponse.json({ error: 'Permission denied. Edit access required.' }, { status: 403 });
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
    const { name, description, group_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const journey = await queryOne<Journey>(`
      INSERT INTO app.journeys (client_id, name, description, group_id, created_by, nodes, connections, canvas_state)
      VALUES ($1, $2, $3, $4, $5, '[]'::jsonb, '[]'::jsonb, '{"zoom": 1, "panX": 0, "panY": 0}'::jsonb)
      RETURNING *
    `, [clientId, name, description || null, group_id || null, userId]);

    return NextResponse.json(journey);
  } catch (error) {
    console.error('Failed to create journey:', error);
    return NextResponse.json(
      { error: 'Failed to create journey' },
      { status: 500 }
    );
  }
}

