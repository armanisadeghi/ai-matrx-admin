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
import { Download, ClipboardCopy, CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface ExportTableModalProps {
  tableId: string;
  tableName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportTableModal({ tableId, tableName, isOpen, onClose }: ExportTableModalProps) {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportAction, setExportAction] = useState('download');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Convert data to Markdown table format
  const convertToMarkdown = (tableData: any) => {
    if (!tableData || !tableData.fields || !tableData.data) {
      throw new Error('Invalid table data for Markdown conversion');
    }

    const fields = tableData.fields;
    const data = tableData.data;
    
    // Create the table header with the table name
    let markdown = `# ${tableName}\n\n`;
    
    // Create the header row
    const headers = fields.map((field: any) => field.display_name);
    markdown += `| ${headers.join(' | ')} |\n`;
    
    // Create the separator row
    markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
    
    // Create the data rows
    data.forEach((row: any) => {
      const rowValues = fields.map((field: any) => {
        const value = row.data[field.field_name];
        return value !== null ? String(value).replace(/\|/g, '\\|') : '';
      });
      
      markdown += `| ${rowValues.join(' | ')} |\n`;
    });
    
    return markdown;
  };

  // Copy markdown to clipboard
  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Table has been copied as Markdown",
        variant: "success",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (exportFormat === 'markdown') {
        // Fetch the complete table data for markdown conversion
        const { data: tableData, error: tableError } = await supabase.rpc('get_user_table_complete', {
          p_table_id: tableId
        });
        
        if (tableError) throw tableError;
        if (!tableData.success) throw new Error(tableData.error || 'Failed to export data');
        
        // Convert to markdown
        const markdown = convertToMarkdown(tableData);
        
        if (exportAction === 'copy') {
          // Copy to clipboard
          await copyToClipboard(markdown);
          onClose();
        } else {
          // Download as .md file
          const blob = new Blob([markdown], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${tableName.replace(/\s+/g, '_')}.md`;
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          onClose();
        }
      } else if (exportFormat === 'csv') {
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
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-md text-red-500 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}
          
          <Tabs defaultValue="format" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="format">Format</TabsTrigger>
              <TabsTrigger value="action" disabled={exportFormat !== 'markdown'}>Action</TabsTrigger>
            </TabsList>
            
            <TabsContent value="format" className="space-y-4">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <RadioGroup 
                  value={exportFormat} 
                  onValueChange={(value) => {
                    setExportFormat(value);
                    if (value !== 'markdown') {
                      setExportAction('download');
                    }
                  }} 
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="csv" id="csv" />
                    <Label htmlFor="csv" className="font-normal">CSV (Comma Separated Values)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="json" id="json" />
                    <Label htmlFor="json" className="font-normal">JSON (JavaScript Object Notation)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="markdown" id="markdown" />
                    <Label htmlFor="markdown" className="font-normal">Markdown Table</Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
            
            <TabsContent value="action" className="space-y-4">
              <div className="space-y-2">
                <Label>Export Action</Label>
                <RadioGroup value={exportAction} onValueChange={setExportAction} className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="download" id="download" />
                    <Label htmlFor="download" className="font-normal">Download as file</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="copy" id="copy" />
                    <Label htmlFor="copy" className="font-normal">Copy to clipboard</Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700">
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleExport}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? 'Exporting...' : (
              <>
                {exportAction === 'copy' && exportFormat === 'markdown' ? (
                  <>
                    {copied ? (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                    )}
                    Copy
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}