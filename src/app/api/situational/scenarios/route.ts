import { NextResponse } from 'next/server';
import { getScenarios, addCustomScenario } from '../../../../lib/db';

export async function GET() {
  try {
    const list = await getScenarios();
    return NextResponse.json(list);
  } catch (err: any) {
    console.error('Failed to get scenarios:', err);
    return NextResponse.json({ error: err.message || 'Failed to list scenarios' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, category, description, urgency, conditions, potentialImpact, recommendations, preventiveMeasures } = body;
    
    if (!title || !category || !conditions || !potentialImpact) {
      return NextResponse.json({ error: 'Title, category, conditions, and potentialImpact are required fields.' }, { status: 400 });
    }

    const created = await addCustomScenario({
      title,
      category,
      description: description || '',
      urgency: urgency || 'Medium',
      conditions,
      potentialImpact,
      recommendations: recommendations || [],
      preventiveMeasures: preventiveMeasures || []
    });

    return NextResponse.json(created);
  } catch (err: any) {
    console.error('Failed to create scenario:', err);
    return NextResponse.json({ error: err.message || 'Failed to create scenario' }, { status: 500 });
  }
}
