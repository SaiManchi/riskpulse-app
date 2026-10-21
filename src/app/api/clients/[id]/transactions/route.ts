import { NextResponse } from 'next/server';
import { addTransaction } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();

    if (Array.isArray(body)) {
      // Batch upload
      const addedTxs = [];
      for (const tx of body) {
        const added = await addTransaction(id, {
          date: tx.date || new Date().toISOString(),
          description: tx.description || 'Uploaded Transaction',
          amount: Number(tx.amount) || 0,
          category: tx.category || 'Other',
          is_flagged: !!tx.is_flagged,
          flag_reason: tx.flag_reason || ''
        });
        if (added) addedTxs.push(added);
      }
      return NextResponse.json({ success: true, count: addedTxs.length, transactions: addedTxs });
    } else {
      // Single creation
      const { date, description, amount, category } = body;
      if (!description || amount === undefined) {
        return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 });
      }
      const added = await addTransaction(id, {
        date: date || new Date().toISOString(),
        description,
        amount: Number(amount),
        category: category || 'Other',
        is_flagged: false
      });
      return NextResponse.json(added);
    }
  } catch (error) {
    console.error('Error adding transaction:', error);
    return NextResponse.json({ error: 'Failed to add transaction' }, { status: 500 });
  }
}
