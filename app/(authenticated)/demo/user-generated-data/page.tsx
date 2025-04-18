'use client'
import { useState, useEffect } from 'react';
import UserTableViewer from "@/components/user-generated-table-data/UserTableViewer";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from '@/utils/supabase/client';
import { TableLoadingComponent } from '@/components/matrx/LoadingComponents';


interface UserTable {
  id: string;
  table_name: string;
  description: string;
  row_count: number;
  field_count: number;
}

export default function UserGeneratedDataPage() {
  const [tables, setTables] = useState<UserTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        fetchUserTables();
    }, []);

  // Fetch user tables
  const fetchUserTables = async () => {
    try {
      setLoading(true);
      console.log("fetching tables");
      const { data, error } = await supabase.rpc('get_user_tables');
      console.log("tables", data);
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to load tables');
      
      setTables(data.tables || []);
      
      // Select the first table by default if available
      if (data.tables && data.tables.length > 0) {
        setSelectedTableId(data.tables[0].id);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('Failed to load your tables');
    } finally {
      setLoading(false);
    }
  };
  

  // Handle table selection
  const handleTableChange = (value: string) => {
    setSelectedTableId(value);
  };

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 p-4 rounded-lg space-y-4 scrollbar-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Data</h1>
        </div>
        
        {!loading && !error && tables.length > 0 && (
          <div className="min-w-[250px]">
            <Select value={selectedTableId || undefined} onValueChange={handleTableChange}>
              <SelectTrigger id="table-select" className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                {tables.map((table) => (
                  <SelectItem 
                    key={table.id} 
                    value={table.id}
                    className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex flex-col">
                      <span>{table.table_name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {table.row_count} rows • {table.field_count} fields
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {loading ? (
        <TableLoadingComponent />
      ) : error ? (
        <div className="py-6 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-1 text-red-400 dark:text-red-300">Please try again or contact support if the issue persists.</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="font-medium">You don't have any data tables yet.</p>
          <p className="text-muted-foreground mt-2">
            Generate a table from AI or create one from your data to get started.
          </p>
        </div>
      ) : (
        <>
          {selectedTableId && (
            <div className="mt-2 scrollbar-none">
              <UserTableViewer tableId={selectedTableId} />
            </div>
          )}
        </>
      )}
    </div>
  );
}