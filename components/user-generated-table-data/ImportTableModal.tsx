'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Clipboard, Settings2, FileSpreadsheet, FileText, CheckCircle2, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  createTable, 
  addRow,
  type FieldDefinition, 
  VALID_DATA_TYPES,
  normalizeDataType
} from '@/utils/user-table-utls/table-utils';

interface ImportTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tableId: string) => void;
}

// Helper function to infer data type from value
function inferDataType(value: any): string {
  if (value === null || value === undefined || value === '') return 'string';
  
  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num) && value !== '') {
    // Check if it's an integer
    if (Number.isInteger(num)) {
      return 'integer';
    }
    return 'number';
  }
  
  // Check for boolean
  const lowerValue = String(value).toLowerCase().trim();
  if (lowerValue === 'true' || lowerValue === 'false') {
    return 'boolean';
  }
  
  // Check for date patterns
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const dateTimePattern = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/;
  if (datePattern.test(String(value))) {
    return 'date';
  }
  if (dateTimePattern.test(String(value))) {
    return 'datetime';
  }
  
  // Check if it looks like JSON
  if (typeof value === 'object') {
    return Array.isArray(value) ? 'array' : 'json';
  }
  
  // Default to string
  return 'string';
}

// Helper function to analyze columns and infer types
function analyzeData(data: Record<string, any>[]): FieldDefinition[] {
  if (data.length === 0) return [];
  
  const columns = Object.keys(data[0]);
  const fields: FieldDefinition[] = [];
  
  columns.forEach((column, index) => {
    // Collect sample values (non-empty)
    const sampleValues = data
      .slice(0, Math.min(100, data.length))
      .map(row => row[column])
      .filter(val => val !== null && val !== undefined && val !== '');
    
    // Infer type from samples
    let inferredType = 'string';
    if (sampleValues.length > 0) {
      const typeCounts: Record<string, number> = {};
      sampleValues.forEach(val => {
        const type = inferDataType(val);
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      // Use the most common type
      inferredType = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    fields.push({
      field_name: column.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_'),
      display_name: column,
      data_type: inferredType,
      field_order: index,
      is_required: false
    });
  });
  
  return fields;
}

export default function ImportTableModal({ isOpen, onClose, onSuccess }: ImportTableModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Common fields
  const [tableName, setTableName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [authenticatedRead, setAuthenticatedRead] = useState(false);
  
  // Upload state
  const [fileName, setFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  
  // Paste state
  const [pasteData, setPasteData] = useState('');
  const [pasteError, setPasteError] = useState<string>('');
  
  // Preview state
  const [fullData, setFullData] = useState<Record<string, any>[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [detectedFields, setDetectedFields] = useState<FieldDefinition[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  // Loading/submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;

    const fileExt = file.name.toLowerCase();
    const isCSV = fileExt.endsWith('.csv');
    const isExcel = fileExt.endsWith('.xlsx') || fileExt.endsWith('.xls');

    if (!isCSV && !isExcel) {
      setUploadError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setFileName(file.name);
    setUploadError('');
    setLoading(true);

    if (isCSV) {
      // Handle CSV files
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as Record<string, any>[];
            if (data.length === 0) {
              setUploadError('CSV file is empty');
              setLoading(false);
              return;
            }

            // Analyze and set preview
            const fields = analyzeData(data);
            setDetectedFields(fields);
            setFullData(data); // Store all data
            setPreviewData(data.slice(0, 10)); // Show first 10 rows
            setShowPreview(true);
            
            // Auto-generate table name from filename if not set
            if (!tableName) {
              const name = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
              setTableName(name);
            }
            
            setLoading(false);
          } catch (err) {
            setUploadError('Failed to parse CSV file');
            console.error(err);
            setLoading(false);
          }
        },
        error: (err) => {
          setUploadError(`Error reading CSV file: ${err.message}`);
          setLoading(false);
        },
      });
    } else {
      // Handle Excel files
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

          if (jsonData.length === 0) {
            setUploadError('Excel file is empty');
            setLoading(false);
            return;
          }

          // Analyze and set preview
          const fields = analyzeData(jsonData);
          setDetectedFields(fields);
          setFullData(jsonData); // Store all data
          setPreviewData(jsonData.slice(0, 10)); // Show first 10 rows
          setShowPreview(true);
          
          // Auto-generate table name from filename if not set
          if (!tableName) {
            const name = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
            setTableName(name);
          }
          
          setLoading(false);
        } catch (err) {
          setUploadError('Failed to parse Excel file');
          console.error(err);
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handlePaste = () => {
    if (!pasteData.trim()) {
      setPasteError('Please paste some data');
      return;
    }

    setPasteError('');
    setLoading(true);

    try {
      // Parse TSV/CSV data (tab or comma separated)
      Papa.parse(pasteData.trim(), {
        header: true,
        skipEmptyLines: true,
        delimiter: '', // Auto-detect
        complete: (results) => {
          try {
            const data = results.data as Record<string, any>[];
            if (data.length === 0) {
              setPasteError('No valid data found');
              setLoading(false);
              return;
            }

            // Analyze and set preview
            const fields = analyzeData(data);
            setDetectedFields(fields);
            setFullData(data); // Store all data
            setPreviewData(data.slice(0, 10)); // Show first 10 rows
            setShowPreview(true);
            setLoading(false);
          } catch (err) {
            setPasteError('Failed to parse pasted data');
            console.error(err);
            setLoading(false);
          }
        },
        error: (err) => {
          setPasteError(`Error parsing data: ${err.message}`);
          setLoading(false);
        },
      });
    } catch (err) {
      setPasteError('Failed to process pasted data');
      console.error(err);
      setLoading(false);
    }
  };

  const updateFieldType = (index: number, newType: string) => {
    const updated = [...detectedFields];
    updated[index].data_type = newType;
    setDetectedFields(updated);
  };

  const handleSubmit = async () => {
    if (!tableName.trim()) {
      setError('Please enter a table name');
      return;
    }

    if (fullData.length === 0) {
      setError('No data to import');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create the table with detected fields
      const createResult = await createTable(supabase, {
        tableName: tableName.trim(),
        description: description.trim() || `Imported table with ${fullData.length} rows`,
        isPublic,
        authenticatedRead,
        fields: detectedFields
      });

      if (!createResult.success || !createResult.tableId) {
        throw new Error(createResult.error || 'Failed to create table');
      }

      const tableId = createResult.tableId;

      // Insert all rows (use the full data, not just preview)
      const dataToInsert = fullData;
      
      for (const row of dataToInsert) {
        // Map the row data to field names
        const rowData: Record<string, any> = {};
        detectedFields.forEach(field => {
          const originalKey = Object.keys(row).find(
            key => key.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_') === field.field_name
          );
          if (originalKey) {
            rowData[field.field_name] = row[originalKey];
          }
        });

        const rowResult = await addRow(supabase, {
          tableId,
          data: rowData
        });

        if (!rowResult.success) {
          console.warn(`Failed to add row:`, rowResult.error);
        }
      }

      // Reset form
      resetForm();
      
      // Call success callback
      onSuccess(tableId);
      onClose();
    } catch (err) {
      console.error('Error importing table:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTableName('');
    setDescription('');
    setIsPublic(false);
    setAuthenticatedRead(false);
    setFileName('');
    setPasteData('');
    setFullData([]);
    setPreviewData([]);
    setDetectedFields([]);
    setShowPreview(false);
    setUploadError('');
    setPasteError('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Table from File or Clipboard</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!showPreview ? (
            <>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'paste')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="flex items-center gap-2">
                    <Clipboard className="h-4 w-4" />
                    Paste Data
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Upload CSV or Excel File</Label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                         onClick={() => fileInputRef.current?.click()}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                        className="hidden"
                      />
                      {fileName ? (
                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">{fileName}</span>
                        </div>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            CSV, XLSX, or XLS files
                          </p>
                        </>
                      )}
                    </div>
                    {uploadError && (
                      <p className="text-sm text-red-500">{uploadError}</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="pasteData">Paste Table Data</Label>
                    <Textarea
                      id="pasteData"
                      value={pasteData}
                      onChange={(e) => setPasteData(e.target.value)}
                      placeholder="Paste data from Google Sheets, Excel, or any table&#10;Example:&#10;Name    Age    Email&#10;John    25     john@example.com&#10;Jane    30     jane@example.com"
                      rows={10}
                      className="font-mono text-sm"
                    />
                    {pasteError && (
                      <p className="text-sm text-red-500">{pasteError}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Copy table data from Google Sheets, Excel, or any spreadsheet and paste it here.
                    </p>
                  </div>
                  <Button
                    onClick={handlePaste}
                    disabled={loading || !pasteData.trim()}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Settings2 className="h-4 w-4 mr-2" />
                        Analyze Data
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <>
              {/* Table configuration */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tableName">Table Name</Label>
                  <Input
                    id="tableName"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="e.g. Customer Data"
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
                    rows={2}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPublic"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                    <Label htmlFor="isPublic">Public Access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="authenticatedRead"
                      checked={authenticatedRead}
                      onCheckedChange={setAuthenticatedRead}
                    />
                    <Label htmlFor="authenticatedRead">Authenticated Access</Label>
                  </div>
                </div>

                {/* Field type configuration */}
                <div className="space-y-2">
                  <Label>Column Configuration</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {detectedFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm font-medium min-w-[150px] truncate">
                          {field.display_name}
                        </span>
                        <Select
                          value={field.data_type}
                          onValueChange={(value) => updateFieldType(index, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
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
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Data types are auto-detected but can be changed if needed.
                  </p>
                </div>

                {/* Data preview */}
                <div className="space-y-2">
                  <Label>Data Preview (first 10 rows)</Label>
                  <div className="border rounded-lg overflow-auto max-h-[250px]">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>
                          {detectedFields.map((field, i) => (
                            <th key={i} className="px-3 py-2 text-left font-medium text-xs">
                              {field.display_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className="border-t dark:border-gray-700">
                            {detectedFields.map((field, j) => {
                              const originalKey = Object.keys(row).find(
                                key => key.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_') === field.field_name
                              );
                              const value = originalKey ? row[originalKey] : '';
                              return (
                                <td key={j} className="px-3 py-2 text-xs truncate max-w-[200px]">
                                  {String(value)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {showPreview && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowPreview(false);
              setFullData([]);
              setPreviewData([]);
              setDetectedFields([]);
              setFileName('');
            }}
            disabled={loading}
          >
            Back
          </Button>
          )}
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {showPreview && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                `Import ${fullData.length} Rows`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

