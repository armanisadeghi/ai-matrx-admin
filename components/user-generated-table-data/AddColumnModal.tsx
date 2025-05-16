'use client';
import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/utils/supabase/client';
import { addColumn, VALID_DATA_TYPES } from '@/utils/user-table-utls/table-utils';

interface AddColumnModalProps {
  tableId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddColumnModal({ tableId, isOpen, onClose, onSuccess }: AddColumnModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [dataType, setDataType] = useState('string');
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate field name from display name
  const generateFieldName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_');
  };

  // Handle display name change
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setFieldName(generateFieldName(value));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Use the utility function
      const result = await addColumn(supabase, {
        tableId,
        fieldName,
        displayName,
        dataType,
        isRequired,
        defaultValue: defaultValue || null
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Reset form and close modal
      setDisplayName('');
      setFieldName('');
      setDataType('string');
      setIsRequired(false);
      setDefaultValue('');
      
      // Call the onSuccess callback first, then close the modal
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding column:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null) {
        setError(JSON.stringify(err));
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 p-2 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="e.g. Total Revenue"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fieldName">Field Name</Label>
            <Input
              id="fieldName"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g. total_revenue"
              required
            />
            <p className="text-xs text-muted-foreground">
              Internal field name used in the database
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dataType">Data Type</Label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger id="dataType">
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                {VALID_DATA_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isRequired"
              checked={isRequired}
              onCheckedChange={setIsRequired}
            />
            <Label htmlFor="isRequired">Required Field</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="defaultValue">Default Value (optional)</Label>
            <Input
              id="defaultValue"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder={`e.g. ${
                dataType === 'boolean' ? 'true/false' :
                dataType === 'number' || dataType === 'integer' ? '0' : 
                dataType === 'date' ? 'YYYY-MM-DD' :
                dataType === 'datetime' ? 'YYYY-MM-DD HH:MM:SS' : 
                dataType === 'json' ? '{}' :
                dataType === 'array' ? '[]' :
                'Default text'
              }`}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Column'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
