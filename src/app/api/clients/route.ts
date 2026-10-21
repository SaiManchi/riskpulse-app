import { NextResponse } from 'next/server';
import { getClients, createClient } from '@/lib/db';

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, industry, businessProfile } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const newClient = await createClient(name, industry || 'Other', businessProfile);
    return NextResponse.json(newClient);
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
