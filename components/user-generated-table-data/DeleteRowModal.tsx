'use client';
import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


interface DeleteRowModalProps {
  rowId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteRowModal({ rowId, isOpen, onClose, onSuccess }: DeleteRowModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle delete
  const handleDelete = async () => {
    if (!rowId) {
      setError('No row selected for deletion');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Call the RPC function
      const { data, error } = await supabase.rpc('delete_data_row_from_user_table', {
        p_row_id: rowId
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete row');
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting row:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!rowId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Row</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this row? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 p-2 rounded-md text-red-500 text-sm">
            {error}
          </div>
        )}
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}