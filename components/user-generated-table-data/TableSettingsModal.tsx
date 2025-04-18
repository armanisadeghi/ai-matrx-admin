'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";


interface TableInfo {
  id: string;
  table_name: string;
  description: string;
  is_public: boolean;
  authenticated_read: boolean;
}

interface TableSettingsModalProps {
  tableId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TableSettingsModal({ tableId, isOpen, onClose, onSuccess }: TableSettingsModalProps) {
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tableName, setTableName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [authenticatedRead, setAuthenticatedRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load table info
  useEffect(() => {
    const fetchTableInfo = async () => {
      if (!isOpen || !tableId) return;
      
      try {
        setLoadingInfo(true);
        
        const { data, error } = await supabase.rpc('get_user_table_complete', {
          p_table_id: tableId
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Failed to load table info');
        
        setTableInfo(data.table);
        setTableName(data.table.table_name);
        setDescription(data.table.description || '');
        setIsPublic(data.table.is_public);
        setAuthenticatedRead(data.table.authenticated_read);
      } catch (err) {
        console.error('Error loading table info:', err);
        setError(err instanceof Error ? err.message : 'Failed to load table info');
      } finally {
        setLoadingInfo(false);
      }
    };
    
    fetchTableInfo();
  }, [tableId, isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableName.trim()) {
      setError('Table name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Call the RPC function
      const { data, error } = await supabase.rpc('update_user_table_metadata', {
        p_table_id: tableId,
        p_table_name: tableName,
        p_description: description,
        p_is_public: isPublic,
        p_authenticated_read: authenticatedRead
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update table settings');
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating table settings:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Table Settings</DialogTitle>
        </DialogHeader>
        
        {loadingInfo ? (
          <div className="py-4 text-center">Loading table information...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 p-2 rounded-md text-red-500 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="tableName">Table Name</Label>
              <Input
                id="tableName"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g. Customers Data"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this table"
                rows={3}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Access Settings</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <div>
                  <Label htmlFor="isPublic">Public Access</Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone can view this table without authentication
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="authenticatedRead"
                  checked={authenticatedRead}
                  onCheckedChange={setAuthenticatedRead}
                />
                <div>
                  <Label htmlFor="authenticatedRead">Authenticated Access</Label>
                  <p className="text-xs text-muted-foreground">
                    Any authenticated user can view this table
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}