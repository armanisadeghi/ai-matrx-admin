'use client';
import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";


interface ExportTableModalProps {
  tableId: string;
  tableName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportTableModal({ tableId, tableName, isOpen, onClose }: ExportTableModalProps) {
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle export
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (exportFormat === 'csv') {
        // Call the CSV export function
        const { data, error } = await supabase.rpc('export_user_table_as_csv', {
          p_table_id: tableId
        });
        
        if (error) throw error;
        if (!data) throw new Error('Failed to export data');
        
        // Download the CSV
        const blob = new Blob([data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName.replace(/\s+/g, '_')}_export.csv`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        onClose();
      } else {
        // Export as JSON
        // First fetch the complete table data
        const { data, error } = await supabase.rpc('get_user_table_complete', {
          p_table_id: tableId
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Failed to export data');
        
        // Download as JSON
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName.replace(/\s+/g, '_')}_export.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        onClose();
      }
    } catch (err) {
      console.error('Error exporting table:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Table</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {error && (
            <div className="bg-red-50 p-2 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={setExportFormat} className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal">CSV (Comma Separated Values)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="font-normal">JSON (JavaScript Object Notation)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? 'Exporting...' : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}