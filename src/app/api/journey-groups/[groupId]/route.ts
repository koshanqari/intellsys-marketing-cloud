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

// GET - Fetch a single journey group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

  const { groupId } = await params;

  try {
    const group = await queryOne<JourneyGroup>(`
      SELECT *
      FROM app.journey_groups
      WHERE id = $1 AND client_id = $2
    `, [groupId, clientId]);

    if (!group) {
      return NextResponse.json({ error: 'Journey group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Failed to fetch journey group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journey group' },
      { status: 500 }
    );
  }
}

// PATCH - Update a journey group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
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

  const { groupId } = await params;

  try {
    const body = await request.json();
    const { name, description, parent_group_id } = body;

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
    if (parent_group_id !== undefined) {
      updates.push(`parent_group_id = $${paramIndex++}`);
      values.push(parent_group_id);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(groupId, clientId);

    const group = await queryOne<JourneyGroup>(`
      UPDATE app.journey_groups
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND client_id = $${paramIndex}
      RETURNING *
    `, values);

    if (!group) {
      return NextResponse.json({ error: 'Journey group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Failed to update journey group:', error);
    return NextResponse.json(
      { error: 'Failed to update journey group' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a journey group (moves children to parent)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
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

  const { groupId } = await params;

  try {
    // First get the group to find its parent
    const group = await queryOne<JourneyGroup>(`
      SELECT * FROM app.journey_groups WHERE id = $1 AND client_id = $2
    `, [groupId, clientId]);

    if (!group) {
      return NextResponse.json({ error: 'Journey group not found' }, { status: 404 });
    }

    // Move all journeys in this group to the parent group (or root if no parent)
    await query(`
      UPDATE app.journeys
      SET group_id = $1
      WHERE group_id = $2 AND client_id = $3
    `, [group.parent_group_id, groupId, clientId]);

    // Move all child groups to the parent group (or root if no parent)
    await query(`
      UPDATE app.journey_groups
      SET parent_group_id = $1
      WHERE parent_group_id = $2 AND client_id = $3
    `, [group.parent_group_id, groupId, clientId]);

    // Delete the group
    await query(`
      DELETE FROM app.journey_groups
      WHERE id = $1 AND client_id = $2
    `, [groupId, clientId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete journey group:', error);
    return NextResponse.json(
      { error: 'Failed to delete journey group' },
      { status: 500 }
    );
  }
}

