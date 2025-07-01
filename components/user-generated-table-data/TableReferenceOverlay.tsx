'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Link } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface TableField {
  id: string;
  field_name: string;
  display_name: string;
  data_type: string;
  field_order: number;
  is_required: boolean;
}

interface TableInfo {
  table_name: string;
  description?: string;
}

interface TableRow {
  id: string;
  data: Record<string, any>;
}

interface TableReferenceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableInfo: TableInfo | null;
  fields: TableField[];
  // Optional overrides for flexibility
  defaultReferenceType?: 'full_table' | 'table_row' | 'table_column' | 'table_cell';
  defaultRowId?: string | null;
  defaultColumnName?: string | null;
  preloadedRows?: TableRow[];
  // Optional callback for when a reference is generated/selected
  onReferenceGenerated?: (reference: any) => void;
}

type ReferenceType = 'full_table' | 'table_row' | 'table_column' | 'table_cell';

export default function TableReferenceOverlay({
  isOpen,
  onClose,
  tableId,
  tableInfo,
  fields,
  defaultReferenceType = 'full_table',
  defaultRowId = null,
  defaultColumnName = null,
  preloadedRows = [],
  onReferenceGenerated
}: TableReferenceOverlayProps) {
  const [referenceType, setReferenceType] = useState<ReferenceType>(defaultReferenceType);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(defaultRowId);
  const [selectedColumnName, setSelectedColumnName] = useState<string | null>(defaultColumnName);
  const [copiedReference, setCopiedReference] = useState<string | null>(null);
  const [rows, setRows] = useState<TableRow[]>(preloadedRows);
  const [loadingRows, setLoadingRows] = useState(false);

  // Load rows for selection if not preloaded
  const loadRows = async () => {
    if (preloadedRows.length > 0 || !isOpen) return;
    
    try {
      setLoadingRows(true);
      const { data, error } = await supabase
        .rpc('get_user_table_data_paginated', { 
          p_table_id: tableId,
          p_limit: 100, // Load first 100 rows for selection
          p_offset: 0,
          p_sort_field: null,
          p_sort_direction: 'asc',
          p_search_term: null
        });
        
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to load rows');
      
      setRows(data.data || []);
    } catch (err) {
      console.error('Error loading rows:', err);
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRows();
    }
  }, [isOpen, tableId]);

  // Reset selections when reference type changes
  useEffect(() => {
    if (referenceType === 'full_table') {
      setSelectedRowId(null);
      setSelectedColumnName(null);
    } else if (referenceType === 'table_row') {
      setSelectedColumnName(null);
    } else if (referenceType === 'table_column') {
      setSelectedRowId(null);
    }
  }, [referenceType]);

  // Copy reference to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReference('copied');
      setTimeout(() => setCopiedReference(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Generate reference based on current selections
  const generateReference = () => {
    const baseReference = {
      table_id: tableId,
      table_name: tableInfo?.table_name || 'Unknown Table',
    };

    switch (referenceType) {
      case 'full_table':
        return {
          type: 'full_table' as const,
          ...baseReference,
          description: `Reference to entire table "${tableInfo?.table_name || 'Unknown Table'}"`
        };

      case 'table_row':
        if (!selectedRowId) return null;
        return {
          type: 'table_row' as const,
          ...baseReference,
          row_id: selectedRowId,
          description: `Reference to row ${selectedRowId} in table "${tableInfo?.table_name || 'Unknown Table'}"`
        };

      case 'table_column':
        if (!selectedColumnName) return null;
        const field = fields.find(f => f.field_name === selectedColumnName);
        return {
          type: 'table_column' as const,
          ...baseReference,
          column_name: selectedColumnName,
          column_display_name: field?.display_name || selectedColumnName,
          description: `Reference to column "${field?.display_name || selectedColumnName}" in table "${tableInfo?.table_name || 'Unknown Table'}"`
        };

      case 'table_cell':
        if (!selectedRowId || !selectedColumnName) return null;
        const cellField = fields.find(f => f.field_name === selectedColumnName);
        return {
          type: 'table_cell' as const,
          ...baseReference,
          row_id: selectedRowId,
          column_name: selectedColumnName,
          column_display_name: cellField?.display_name || selectedColumnName,
          description: `Reference to cell "${cellField?.display_name || selectedColumnName}" in row ${selectedRowId} of table "${tableInfo?.table_name || 'Unknown Table'}"`
        };

      default:
        return null;
    }
  };

  const currentReference = generateReference();
  const referenceJson = currentReference ? JSON.stringify(currentReference, null, 2) : '';

  // Get display value for selected row
  const getRowDisplayValue = (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return rowId;
    
    // Try to find a meaningful field to display (name, title, etc.)
    const meaningfulFields = ['name', 'title', 'label', 'description'];
    for (const fieldName of meaningfulFields) {
      if (row.data[fieldName]) {
        return `${row.data[fieldName]} (${rowId})`;
      }
    }
    
    // Fallback to first non-null field value
    const firstValue = Object.values(row.data).find(val => val !== null && val !== undefined);
    return firstValue ? `${firstValue} (${rowId})` : rowId;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[50vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5" />
            <span>Create Table Reference</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create intelligent references for workflows. Select the type of reference and configure the specific data you want to target.
          </p>
          
          {/* Reference Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Reference Type</Label>
            <Select value={referenceType} onValueChange={(value: ReferenceType) => setReferenceType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_table">Entire Table</SelectItem>
                <SelectItem value="table_row">Specific Row</SelectItem>
                <SelectItem value="table_column">Entire Column</SelectItem>
                <SelectItem value="table_cell">Specific Cell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row Selection (for row and cell types) */}
          {(referenceType === 'table_row' || referenceType === 'table_cell') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Row</Label>
              {loadingRows ? (
                <div className="text-sm text-gray-500">Loading rows...</div>
              ) : (
                <Select value={selectedRowId || ''} onValueChange={setSelectedRowId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a row..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {rows.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {getRowDisplayValue(row.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Column Selection (for column and cell types) */}
          {(referenceType === 'table_column' || referenceType === 'table_cell') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Column</Label>
              <Select value={selectedColumnName || ''} onValueChange={setSelectedColumnName}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a column..." />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((field) => (
                    <SelectItem key={field.id} value={field.field_name}>
                      {field.display_name} ({field.data_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Generated Reference */}
          {currentReference && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Generated Reference</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(referenceJson)}
                    className="flex items-center space-x-1"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedReference === 'copied' ? 'Copied!' : 'Copy'}</span>
                  </Button>
                  {onReferenceGenerated && (
                    <Button
                      size="sm"
                      onClick={() => onReferenceGenerated(currentReference)}
                      className="flex items-center space-x-1"
                    >
                      Save Reference
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={referenceJson}
                readOnly
                rows={Math.min(12, referenceJson.split('\n').length)}
                className="text-xs font-mono bg-gray-50 dark:bg-gray-900"
              />
            </div>
          )}

          {/* Reference Type Descriptions */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Reference Types</h4>
            <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
              <li>• <strong>Table:</strong> Retrieves all data from the entire table</li>
              <li>• <strong>Row:</strong> Gets all field values for a specific row</li>
              <li>• <strong>Column:</strong> Returns all values from a specific column across all rows</li>
              <li>• <strong>Cell:</strong> Gets the value of a specific field in a specific row</li>
            </ul>
          </div>

          {/* Usage Instructions */}
          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-md">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Usage in Workflows</h4>
            <p className="text-xs text-green-600 dark:text-green-300">
              Copy the generated reference and paste it into workflow nodes that support table data retrieval. 
              The reference contains all the information needed to fetch the specified data.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 