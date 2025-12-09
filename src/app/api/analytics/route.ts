import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { 
  getAnalyticsSummary, 
  getTemplateStats, 
  getTemplateNames,
  getClientById
} from '@/lib/queries';

export async function GET(request: NextRequest) {
  // Check for either super admin session or client user session
  const adminSession = await getSession();
  const clientUserSession = await getClientUserSession();
  
  if (!adminSession && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get client ID - from client user session or from admin's selected client
  let clientId: string | null = null;
  
  if (clientUserSession) {
    // Client user - use their client_id
    clientId = clientUserSession.client_id;
  } else if (adminSession) {
    // Super admin - get selected client
    clientId = await getCurrentClient();
    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }
  }

  // Final check - clientId should never be null at this point, but TypeScript needs this
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  try {
    const [client, templateNames] = await Promise.all([
      getClientById(clientId),
      getTemplateNames(clientId),
    ]);

    return NextResponse.json({
      clientId,
      clientName: client?.name || 'Unknown',
      templateNames,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
