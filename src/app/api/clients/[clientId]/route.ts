import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClientById, updateClient } from '@/lib/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { clientId } = await params;

  try {
    const client = await getClientById(clientId);
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Failed to fetch client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { clientId } = await params;

  try {
    const body = await request.json();
    
    const client = await updateClient(clientId, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      industry: body.industry,
      logo_url: body.logo_url,
      whatsapp_enabled: body.whatsapp_enabled,
      sms_enabled: body.sms_enabled,
      email_enabled: body.email_enabled,
      status: body.status,
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Failed to update client:', error);
    const message = error instanceof Error ? error.message : 'Failed to update client';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

