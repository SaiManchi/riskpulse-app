import { NextResponse } from 'next/server';
import { getClientById, updateClientMetrics, deleteClient, updateClientBusinessProfile } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    const { financialMetrics, cyberMetrics, businessProfile } = body;
    
    let updated;
    if (businessProfile) {
      updated = await updateClientBusinessProfile(id, businessProfile);
    } else {
      updated = await updateClientMetrics(id, financialMetrics || {}, cyberMetrics || {});
    }
    
    if (!updated) {
      return NextResponse.json({ error: 'Client not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const success = await deleteClient(id);
    if (!success) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
