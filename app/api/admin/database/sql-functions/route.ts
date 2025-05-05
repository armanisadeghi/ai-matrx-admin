import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Call the RPC function to get database functions
    const { data, error } = await supabase.rpc('get_database_functions');
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching SQL functions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SQL functions' },
      { status: 500 }
    );
  }
} 