import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

interface JourneyGroup {
  id: string;
  client_id: string;
  parent_group_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Check if journey_groups table exists
async function checkTableExists(): Promise<boolean> {
  try {
    const result = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'app' 
        AND table_name = 'journey_groups'
      ) as exists
    `);
    return result?.exists || false;
  } catch {
    return false;
  }
}

// GET - List all journey groups for current client
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

  // Get optional parent_group_id filter
  const { searchParams } = new URL(request.url);
  const parentGroupId = searchParams.get('parent_group_id');

  try {
    // Check if table exists (backwards compatibility)
    const tableExists = await checkTableExists();
    if (!tableExists) {
      // Return empty array if migration hasn't been run yet
      return NextResponse.json([]);
    }

    let groups: JourneyGroup[];
    
    if (parentGroupId === 'null' || parentGroupId === '') {
      // Get root level groups
      groups = await query<JourneyGroup>(`
        SELECT *
        FROM app.journey_groups
        WHERE client_id = $1 AND parent_group_id IS NULL
        ORDER BY name ASC
      `, [clientId]);
    } else if (parentGroupId) {
      // Get groups within a specific parent
      groups = await query<JourneyGroup>(`
        SELECT *
        FROM app.journey_groups
        WHERE client_id = $1 AND parent_group_id = $2
        ORDER BY name ASC
      `, [clientId, parentGroupId]);
    } else {
      // Get all groups
      groups = await query<JourneyGroup>(`
        SELECT *
        FROM app.journey_groups
        WHERE client_id = $1
        ORDER BY name ASC
      `, [clientId]);
    }

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Failed to fetch journey groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journey groups' },
      { status: 500 }
    );
  }
}

// POST - Create a new journey group
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
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (adminSession) {
    clientId = await getCurrentClient();
  }

  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  try {
    // Check if table exists
    const tableExists = await checkTableExists();
    if (!tableExists) {
      return NextResponse.json(
        { error: 'Journey groups not available. Please run the migration first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, parent_group_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const group = await queryOne<JourneyGroup>(`
      INSERT INTO app.journey_groups (client_id, name, description, parent_group_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [clientId, name, description || null, parent_group_id || null]);

    return NextResponse.json(group);
  } catch (error) {
    console.error('Failed to create journey group:', error);
    return NextResponse.json(
      { error: 'Failed to create journey group' },
      { status: 500 }
    );
  }
}

