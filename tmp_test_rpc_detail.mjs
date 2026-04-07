import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

async function test() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc('get_tool_detail', { p_tool_id: 'e68be41f-d3fd-44c3-b097-7eebd07d4b5f' });
    console.log("Detail:", JSON.stringify(data, null, 2));
    
    if (error) console.error(error);
}

test();
