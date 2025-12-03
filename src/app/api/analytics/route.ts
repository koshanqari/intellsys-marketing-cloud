import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentClient } from '@/lib/auth';
import { 
  getAnalyticsSummary, 
  getTemplateStats, 
  getTemplateNames,
  getClientById
} from '@/lib/queries';

export async function GET(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = await getCurrentClient();
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  try {
    const [client, summary, templateStats, templateNames] = await Promise.all([
      getClientById(clientId),
      getAnalyticsSummary(clientId, startDate, endDate),
      getTemplateStats(clientId, startDate, endDate),
      getTemplateNames(clientId),
    ]);

    return NextResponse.json({
      clientId,
      clientName: client?.name || 'Unknown',
      summary,
      templateStats,
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
