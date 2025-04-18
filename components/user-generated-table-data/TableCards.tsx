'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableIcon, Plus, Loader, Trash2, Edit2, Calendar } from 'lucide-react';
import Link from 'next/link';
import CreateTableModal from './CreateTableModal';
import EditTableModal from './EditTableModal';
import { 
  AlertDialog,
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { format } from 'date-fns';

interface UserTable {
  id: string;
  table_name: string;
  description: string;
  row_count: number;
  field_count: number;
  updated_at: string;
  is_public: boolean;
  authenticated_read: boolean;
}

export default function TableCards() {
  const [tables, setTables] = useState<UserTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<UserTable | null>(null);
  const [tableToEdit, setTableToEdit] = useState<UserTable | null>(null);
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

  // Delete a table
  const deleteTable = async () => {
    if (!tableToDelete) return;
    
    try {
      const { data, error } = await supabase.rpc('delete_user_table', {
        p_table_id: tableToDelete.id
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete table');
      
      // Update local state after successful deletion
      setTables(tables.filter(table => table.id !== tableToDelete.id));
      toast({
        title: "Table deleted",
        description: `"${tableToDelete.table_name}" has been deleted successfully`,
      });
    } catch (err) {
      console.error('Error deleting table:', err);
      toast({
        title: "Error",
        description: "Failed to delete the table. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTableToDelete(null);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (err) {
      return 'Unknown date';
    }
  };

  // Handle successful table creation
  const handleTableCreated = (tableId: string) => {
    // Refresh the tables list
    fetchUserTables();
    
    // Navigate to the new table
    router.push(`/data/${tableId}`);
  };

  // Open delete confirmation
  const confirmDelete = (table: UserTable, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTableToDelete(table);
  };

  // Open edit modal
  const openEditModal = (table: UserTable, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTableToEdit(table);
  };

  // Handle successful table update
  const handleTableUpdated = () => {
    fetchUserTables();
    toast({
      title: "Table updated",
      description: "The table has been updated successfully",
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 h-[300px] flex flex-col">
            <CardHeader className="pb-2">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="h-16 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </CardContent>
            <CardFooter className="mt-auto">
              <div className="h-9 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
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
            <Card className="h-[300px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-md dark:hover:shadow-black/30 transition-all cursor-pointer group-hover:border-blue-300 dark:group-hover:border-blue-700 flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {table.table_name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={(e) => openEditModal(table, e)}
                      className="text-gray-400 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => confirmDelete(table, e)}
                      className="text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                    <TableIcon size={18} className="text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-500" />
                  </div>
                </div>
                
                <CardDescription className="text-gray-500 dark:text-gray-400 min-h-[3rem] mt-1 line-clamp-2">
                  {table.description || <span className="text-gray-400 dark:text-gray-600 italic">No description</span>}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1">
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-sm mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Rows:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-300">{table.row_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fields:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-300">{table.field_count}</span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                    <Calendar size={12} className="mr-1" />
                    <span>Last updated: {formatDate(table.updated_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {table.is_public && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        Public
                      </span>
                    )}
                    {table.authenticated_read && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        Authenticated
                      </span>
                    )}
                    {!table.is_public && !table.authenticated_read && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        Private
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="mt-auto">
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
          className="h-[300px] bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md dark:hover:shadow-black/30 transition-all cursor-pointer flex flex-col"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-800 dark:text-gray-200">Create New Table</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400 min-h-[3rem] mt-1">
              Generate or import a new data table
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Plus size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
          
          <CardFooter className="mt-auto">
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

      {/* Edit Table Modal */}
      {tableToEdit && (
        <EditTableModal
          isOpen={tableToEdit !== null}
          onClose={() => setTableToEdit(null)}
          onSuccess={handleTableUpdated}
          tableId={tableToEdit.id}
          initialData={{
            table_name: tableToEdit.table_name,
            description: tableToEdit.description,
            is_public: tableToEdit.is_public,
            authenticated_read: tableToEdit.authenticated_read
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={tableToDelete !== null} onOpenChange={(open) => !open && setTableToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">Delete Table</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-gray-200">{tableToDelete?.table_name}</span>? This action cannot be undone and will permanently delete all data in this table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteTable}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
            >
              Delete Table
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 