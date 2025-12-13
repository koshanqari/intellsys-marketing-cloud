import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

interface MessageLog {
  id: string;
  client_id: string;
  name: string | null;
  phone: string | null;
  template_name: string | null;
  status_code: number | null;
  status_message: string | null;
  message_id: string | null;
  message_status: string | null;
  message_status_detailed: string | null;
  created_at: Date;
  updated_at: Date;
}

// GET - Fetch a single message log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!session && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (session) {
    clientId = await getCurrentClient();
  }
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const { messageId } = await params;

  try {
    const message = await queryOne<MessageLog>(`
      SELECT * FROM app.message_logs
      WHERE id = $1 AND client_id = $2
    `, [messageId, clientId]);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 });
  }
}

// PATCH - Update a message log
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!session && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions - super admin always allowed, client users need analytics_edit permission
  const isSuperAdmin = !!session && !clientUserSession;
  if (!isSuperAdmin && clientUserSession) {
    if (!clientUserSession.permissions?.analytics_edit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
  }

  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (session) {
    clientId = await getCurrentClient();
  }
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const { messageId } = await params;

  try {
    const body = await request.json();
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'phone', 'status_code', 'status_message', 'message_status', 'message_status_detailed', 'template_name', 'message_id'];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(messageId, clientId);

    const message = await queryOne<MessageLog>(`
      UPDATE app.message_logs
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND client_id = $${paramIndex}
      RETURNING *
    `, values);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

// DELETE - Delete a message log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!session && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions - super admin always allowed, client users need analytics_delete permission
  const isSuperAdmin = !!session && !clientUserSession;
  if (!isSuperAdmin && clientUserSession) {
    if (!clientUserSession.permissions?.analytics_delete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
  }

  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (session) {
    clientId = await getCurrentClient();
  }
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const { messageId } = await params;

  try {
    const result = await query(`
      DELETE FROM app.message_logs
      WHERE id = $1 AND client_id = $2
      RETURNING id
    `, [messageId, clientId]);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}


