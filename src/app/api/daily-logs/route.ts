import { NextRequest, NextResponse } from 'next/server';
import { getClientById, addOrUpdateDailyLog, toggleDailyDuty, generateAIDailyBriefing, getClients } from '@/lib/db';
import { DailyLogEntry } from '@/lib/seedData';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({
      clientId: client.id,
      clientName: client.name,
      dailyLogs: client.dailyLogs || []
    });
  } catch (error: any) {
    console.error('Failed in GET /api/daily-logs:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (action === 'save_log') {
      const entry: DailyLogEntry = body.entry;
      if (!entry || !entry.date) {
        return NextResponse.json({ error: 'Invalid daily log entry' }, { status: 400 });
      }
      const updatedClient = await addOrUpdateDailyLog(clientId, entry);
      return NextResponse.json({
        success: true,
        dailyLogs: updatedClient?.dailyLogs || []
      });
    }

    if (action === 'toggle_duty') {
      const { logId, dutyId } = body;
      if (!logId || !dutyId) {
        return NextResponse.json({ error: 'Missing logId or dutyId' }, { status: 400 });
      }
      const updatedClient = await toggleDailyDuty(clientId, logId, dutyId);
      return NextResponse.json({
        success: true,
        dailyLogs: updatedClient?.dailyLogs || []
      });
    }

    if (action === 'generate_briefing') {
      const todayLog: DailyLogEntry = body.todayLog || (client.dailyLogs && client.dailyLogs[0]);
      if (!todayLog) {
        return NextResponse.json({ error: 'No daily log available to analyze' }, { status: 400 });
      }
      const briefing = await generateAIDailyBriefing(client, todayLog);
      return NextResponse.json({
        success: true,
        briefing
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Failed in POST /api/daily-logs:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
