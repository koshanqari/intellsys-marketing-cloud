import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient } from '@/lib/auth';
import { query } from '@/lib/db';

interface TemplateMessage {
  id: string;
  name: string | null;
  phone: string | null;
  status_code: number | null;
  status_message: string | null;
  message_status: string | null;
  message_status_detailed: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TemplateSummary {
  total: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateName: string }> }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = await getCurrentClient();
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const { templateName } = await params;
  const decodedTemplateName = decodeURIComponent(templateName);

  try {
    // Get summary stats for this template
    const summaryResult = await query<{
      total: string;
      delivered: string;
      read: string;
      failed: string;
      pending: string;
    }>(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN message_status = 'delivered' THEN 1 END)::int as delivered,
        COUNT(CASE WHEN message_status = 'read' THEN 1 END)::int as read,
        COUNT(CASE WHEN status_code != 200 THEN 1 END)::int as failed,
        COUNT(CASE WHEN message_status IS NULL AND status_code = 200 THEN 1 END)::int as pending
      FROM app.message_logs
      WHERE client_id = $1 AND template_name = $2
    `, [clientId, decodedTemplateName]);

    const summary: TemplateSummary = {
      total: parseInt(summaryResult[0]?.total || '0'),
      delivered: parseInt(summaryResult[0]?.delivered || '0'),
      read: parseInt(summaryResult[0]?.read || '0'),
      failed: parseInt(summaryResult[0]?.failed || '0'),
      pending: parseInt(summaryResult[0]?.pending || '0'),
    };

    // Get all messages for this template
    const messages = await query<TemplateMessage>(`
      SELECT 
        id,
        name,
        phone,
        status_code,
        status_message,
        message_status,
        message_status_detailed,
        created_at,
        updated_at
      FROM app.message_logs
      WHERE client_id = $1 AND template_name = $2
      ORDER BY created_at DESC
    `, [clientId, decodedTemplateName]);

    return NextResponse.json({
      templateName: decodedTemplateName,
      summary,
      messages,
    });
  } catch (error) {
    console.error('Failed to fetch template details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template details' },
      { status: 500 }
    );
  }
}
