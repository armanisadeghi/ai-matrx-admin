import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://txzxabzwovsujtloxrus.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4enhhYnp3b3ZzdWp0bG94cnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIxMTU5NzEsImV4cCI6MjAzNzY5MTk3MX0.7mmSbQYGIdc_yZuwawXKSEYr2OUBDfDHqnqUSrIUamk', {
    db: {
        schema: 'public'
    },
    global: {
        headers: { 'x-my-custom-header': 'my-app-name' },
    },
})

interface FindFkEntriesArgs {
    tableName: string;
    id: string;
}

interface FkEntry {
    fk_column_name: string;
    referenced_table_name: string;
    referenced_column_name: string;
    referenced_entry: any;
}

async function findFkEntries(args: FindFkEntriesArgs): Promise<FkEntry[]> {
    console.log('Calling find_fk_entries with args:', args);

    const { data, error } = await supabase.rpc('find_fk_entries', {
        p_table_name: args.tableName,
        p_id: args.id
    })

    if (error) {
        console.error('Error in findFkEntries:', error);
        throw error;
    }

    console.log('findFkEntries response:', data);
    return data || [];
}

export async function runSupabaseTest() {
    try {
        const results = await findFkEntries({
            tableName: 'registered_function',
            id: 'fff3c273-0803-4781-961e-64be7baf0c34'
        });
        console.log('Test results:', results);
        return results;
    } catch (error) {
        console.error('Test error:', error);
        throw error;
    }
}