import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

async function test() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc('get_tools_list', { p_page: 1, p_page_size: 5 });
    console.log("List:", JSON.stringify(data, null, 2));
    
    if (error) console.error(error);
}

test();
