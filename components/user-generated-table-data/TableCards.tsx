'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableIcon, Plus, Loader } from 'lucide-react';
import Link from 'next/link';
import CreateTableModal from './CreateTableModal';

interface UserTable {
  id: string;
  table_name: string;
  description: string;
  row_count: number;
  field_count: number;
}

export default function TableCards() {
  const [tables, setTables] = useState<UserTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUserTables();
  }, []);

  // Fetch user tables
  const fetchUserTables = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_tables');
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to load tables');
      
      setTables(data.tables || []);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('Failed to load your tables');
    } finally {
      setLoading(false);
    }
  };

  // Handle successful table creation
  const handleTableCreated = (tableId: string) => {
    // Refresh the tables list
    fetchUserTables();
    
    // Navigate to the new table
    router.push(`/data/${tableId}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-2">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </CardContent>
            <CardFooter>
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="font-medium">{error}</p>
        <p className="text-sm mt-1 text-red-400 dark:text-red-300">Please try again or contact support if the issue persists.</p>
        <Button 
          onClick={fetchUserTables} 
          variant="outline" 
          className="mt-4 border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => (
          <Link key={table.id} href={`/data/${table.id}`} className="group">
            <Card className="h-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-md dark:hover:shadow-black/30 transition-all cursor-pointer group-hover:border-blue-300 dark:group-hover:border-blue-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {table.table_name}
                  </CardTitle>
                  <TableIcon size={18} className="text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-500" />
                </div>
                {table.description && (
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    {table.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between mb-1">
                    <span>Rows:</span>
                    <span className="font-medium">{table.row_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fields:</span>
                    <span className="font-medium">{table.field_count}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  View Table
                </Button>
              </CardFooter>
            </Card>
          </Link>
        ))}

        {/* Create New Table Card */}
        <Card 
          className="h-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md dark:hover:shadow-black/30 transition-all cursor-pointer"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-800 dark:text-gray-200">Create New Table</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Generate or import a new data table
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Plus size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Create Table
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Create Table Modal */}
      <CreateTableModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTableCreated}
      />
    </div>
  );
} 