import { NextResponse } from 'next/server';
import { getSession, getCurrentClient, getClientUserSession } from '@/lib/auth';
import { getTemplateNames, getClientById } from '@/lib/queries';

// Lightweight endpoint - only returns template names for listing
export async function GET() {
  const session = await getSession();
  const clientUserSession = await getClientUserSession();
  
  // Allow both super admin and client users
  if (!session && !clientUserSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get client ID - from client user session or from admin's selected client
  let clientId: string | null = null;
  
  if (clientUserSession) {
    clientId = clientUserSession.client_id;
  } else if (session) {
    clientId = await getCurrentClient();
  }
  
  if (!clientId) {
    return NextResponse.json({ error: 'No client selected' }, { status: 400 });
  }

  try {
    // Only fetch what we need - client name and template names
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
    console.error('Failed to fetch template list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

