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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";


interface TableField {
  id: string;
  field_name: string;
  display_name: string;
  data_type: string;
  field_order: number;
  is_required: boolean;
}

interface EditRowModalProps {
  tableId: string;
  rowId: string | null;
  rowData: Record<string, any> | null;
  fields: TableField[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRowModal({ 
  tableId, 
  rowId, 
  rowData: initialRowData, 
  fields, 
  isOpen, 
  onClose, 
  onSuccess 
}: EditRowModalProps) {
  const [rowData, setRowData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize row data when modal opens
  useEffect(() => {
    if (isOpen && initialRowData) {
      setRowData(initialRowData);
    }
  }, [isOpen, initialRowData]);
  
  // Handle field value change
  const handleValueChange = (fieldName: string, value: any) => {
    setRowData((prev) => ({
      ...prev,
      [fieldName]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rowId) {
      setError('No row selected for editing');
      return;
    }
    
    // Validate required fields
    const missingFields = fields
      .filter(field => field.is_required && (rowData[field.field_name] === null || rowData[field.field_name] === undefined))
      .map(field => field.display_name);
    
    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Call the RPC function
      const { data, error } = await supabase.rpc('update_data_row_in_user_table', {
        p_row_id: rowId,
        p_data: rowData
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update row');
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating row:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Render different input based on data type
  const renderFieldInput = (field: TableField) => {
    const value = rowData[field.field_name];
    
    switch (field.data_type) {
      case 'boolean':
        return (
          <Checkbox
            id={field.field_name}
            checked={value === true}
            onCheckedChange={(checked) => handleValueChange(field.field_name, checked)}
          />
        );
        
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                {value ? format(new Date(value), 'PPP') : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleValueChange(field.field_name, date ? format(date, 'yyyy-MM-dd') : null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
        
      case 'number':
      case 'integer':
        return (
          <Input
            id={field.field_name}
            type="number"
            value={value === null || value === undefined ? '' : value}
            onChange={(e) => {
              const val = e.target.value === '' ? null : 
                field.data_type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value);
              handleValueChange(field.field_name, val);
            }}
            step={field.data_type === 'integer' ? 1 : 0.01}
          />
        );
        
      case 'datetime':
        return (
          <Input
            id={field.field_name}
            type="datetime-local"
            value={value || ''}
            onChange={(e) => handleValueChange(field.field_name, e.target.value)}
          />
        );
        
      default: // string and other types
        return (
          <Input
            id={field.field_name}
            value={value === null || value === undefined ? '' : value}
            onChange={(e) => handleValueChange(field.field_name, e.target.value)}
          />
        );
    }
  };

  if (!rowId || !fields.length) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Row</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 p-2 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2 scrollbar-none">
            {fields.sort((a, b) => a.field_order - b.field_order).map((field) => (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor={field.field_name} className="flex-grow">
                    {field.display_name}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {field.data_type}
                  </span>
                </div>
                {renderFieldInput(field)}
              </div>
            ))}
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
      </DialogContent>
    </Dialog>
  );
}