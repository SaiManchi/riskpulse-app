import { NextResponse } from 'next/server';
import { addVendor } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { name, criticality, payment_history, security_score, contract_renewal, country } = await request.json();

    if (!name || !criticality) {
      return NextResponse.json({ error: 'Name and criticality are required' }, { status: 400 });
    }

    const added = await addVendor(id, {
      name,
      criticality,
      payment_history: payment_history || 'good',
      security_score: Number(security_score) || 80,
      contract_renewal: contract_renewal || new Date().toISOString().split('T')[0],
      country: country || 'USA'
    });

    return NextResponse.json(added);
  } catch (error) {
    console.error('Error adding vendor:', error);
    return NextResponse.json({ error: 'Failed to add vendor' }, { status: 500 });
  }
}
