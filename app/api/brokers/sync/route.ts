// app/api/brokers/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { brokerCache } from '@/lib/server/brokerCache';
import { getUser } from '@/utils/supabase/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brokers } = await request.json();
    
    // Sync brokers to server cache
    await brokerCache.syncBrokers(brokers, user.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}