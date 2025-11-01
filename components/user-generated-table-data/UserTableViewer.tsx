'use client'

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { supabase } from '@/utils/supabase/client';
import TableToolbar from './TableToolbar';
import { Pencil, Trash, Loader, Expand, Link, Wand2 } from 'lucide-react';
import { TableLoadingComponent } from '@/components/matrx/LoadingComponents';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import TableReferenceModal from './TableReferenceModal';

interface UserTable {
  id: string;
  table_name: string;
  description: string;
  row_count: number;
  field_count: number;
}

interface UserTableViewerProps {
  tableId: string;
  showTableSelector?: boolean;
}

const UserTableViewer = ({ tableId, showTableSelector = false }: UserTableViewerProps) => {
  const router = useRouter();
  const [tableInfo, setTableInfo] = useState(null);
  const [fields, setFields] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Sorting state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Row action state
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Additional modals
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTableSettingsModal, setShowTableSettingsModal] = useState(false);
  const [showReferenceOverlay, setShowReferenceOverlay] = useState(false);
  
  // Table selector state
  const [tables, setTables] = useState<UserTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  
  // Text expansion modal state
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [expandedFieldName, setExpandedFieldName] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [expandedFieldKey, setExpandedFieldKey] = useState<string | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [expandedTextModified, setExpandedTextModified] = useState(false);
  const [savingExpandedText, setSavingExpandedText] = useState(false);
  
  // Reference modal state
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceRowId, setReferenceRowId] = useState<string | null>(null);
  const [referenceRowData, setReferenceRowData] = useState<any>(null);
  
  // Row ordering state
  const [rowOrderingEnabled, setRowOrderingEnabled] = useState(false);
  const [showRowOrderingModal, setShowRowOrderingModal] = useState(false);
  
  // Add this helper function after the other state declarations and before formatCellValue
  const cleanupHtmlText = (text: string): string => {
    if (!text || typeof text !== 'string') return text;
    
    // Replace <br> and <br/> tags with newlines
    let cleaned = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Replace HTML entities
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    
    // Remove any remaining HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Clean up extra whitespace but preserve intentional line breaks
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n'); // Multiple newlines become double newlines
    cleaned = cleaned.replace(/^\s+|\s+$/g, ''); // Trim start and end
    
    return cleaned;
  };
  
  // Add this helper function to detect if text contains HTML that can be cleaned
  const containsCleanableHtml = (text: string): boolean => {
    if (!text || typeof text !== 'string') return false;
    
    // Check for <br> tags or other common HTML patterns
    return /<br\s*\/?>/gi.test(text) || 
           /&lt;|&gt;|&amp;|&quot;|&#39;|&nbsp;/g.test(text) ||
           /<[^>]*>/g.test(text);
  };
  
  // Add this function to handle the cleanup and update
  const handleCleanupText = async (fieldName: string, originalText: string, rowId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row edit modal from opening
    
    try {
      const cleanedText = cleanupHtmlText(originalText);
      
      if (cleanedText === originalText) {
        // No changes needed
        return;
      }
      
      // Update the row data
      const updatedData = { [fieldName]: cleanedText };
      
      const { data, error } = await supabase.rpc('update_data_row_in_user_table', {
        p_row_id: rowId,
        p_data: updatedData
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update row');
      
      // Reload the table data to reflect changes
      loadTableData(currentPage, limit, sortField, sortDirection, searchTerm);
    } catch (err) {
      console.error('Error cleaning up text:', err);
      setError(err instanceof Error ? err.message : 'Failed to cleanup text');
    }
  };
  
  // Load tables for selector
  const loadTables = async () => {
    if (!showTableSelector) return;
    
    try {
      setTablesLoading(true);
      const { data, error } = await supabase.rpc('get_user_tables');
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to load tables');
      
      setTables(data.tables || []);
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setTablesLoading(false);
    }
  };
  
  // Handle table selection change
  const handleTableChange = (value: string) => {
    if (value !== tableId) {
      router.push(`/data/${value}`);
    }
  };
  
  // Load table data
  const loadTableData = async (page = 1, pageLimit = limit, sort = sortField, direction = sortDirection, search = searchTerm, forceReload = false) => {
    setLoading(true);
    try {
      // Load table metadata and fields (always reload if forceReload is true)
      let currentTableInfo = tableInfo;
      let currentFields = fields;
      
      if (!tableInfo || !fields.length || forceReload) {
        const { data: tableData, error: tableError } = await supabase
          .rpc('get_user_table_complete', { p_table_id: tableId });
          
        if (tableError) throw tableError;
        if (!tableData.success) throw new Error(tableData.error || 'Failed to load table');
        
        currentTableInfo = tableData.table;
        currentFields = tableData.fields;
        
        setTableInfo(tableData.table);
        setFields(tableData.fields);
        setTotalCount(tableData.row_count);
        setTotalPages(Math.ceil(tableData.row_count / pageLimit));
      }
      
      // Then load paginated data
      const offset = (page - 1) * pageLimit;
      const { data: paginatedData, error: paginatedError } = await supabase
        .rpc('get_user_table_data_paginated', { 
          p_table_id: tableId,
          p_limit: pageLimit,
          p_offset: offset,
          p_sort_field: sort,
          p_sort_direction: direction,
          p_search_term: search || null
        });
        
      if (paginatedError) throw paginatedError;
      if (!paginatedData.success) throw new Error(paginatedData.error || 'Failed to load data');
      
      let processedData = paginatedData.data;
      
      // Apply row ordering if enabled and no other sorting is active
      if (currentTableInfo?.row_ordering_config?.enabled && currentTableInfo.row_ordering_config.order && !sort) {
        const orderConfig = currentTableInfo.row_ordering_config.order;
        processedData = [...paginatedData.data].sort((a, b) => {
          const aIndex = orderConfig.indexOf(a.id);
          const bIndex = orderConfig.indexOf(b.id);
          
          // If both items are in the order config, sort by their position
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          
          // If only one item is in the order config, prioritize it
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          
          // If neither item is in the order config, maintain original order
          return 0;
        });
      }
      
      // Apply client-side sorting if we have a sort field and conditions are right for client-side sorting
      if (sort && !search && page === 1 && pageLimit >= paginatedData.pagination.total_count) {
        processedData = smartSort(processedData, sort, direction as 'asc' | 'desc');
      }

      setData(processedData);
      setTotalCount(paginatedData.pagination.total_count);
      setTotalPages(paginatedData.pagination.page_count);
      setCurrentPage(paginatedData.pagination.current_page);
    } catch (err) {
      console.error('Error loading table data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data load
  useEffect(() => {
    if (tableId) {
      loadTableData();
      if (showTableSelector) {
        loadTables();
      }
    }
  }, [tableId, showTableSelector]);
  
  // Check row ordering status when table info changes
  useEffect(() => {
    if (tableInfo) {
      setRowOrderingEnabled(checkRowOrderingEnabled());
    }
  }, [tableInfo]);
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadTableData(page, limit);
  };
  
  // Handle rows per page change
  const handleLimitChange = (newLimit) => {
    const numLimit = parseInt(newLimit, 10);
    setLimit(numLimit);
    // Reset to first page when changing limit
    setCurrentPage(1);
    loadTableData(1, numLimit);
  };
  
  // Smart numeric sorting helper
  const isNumericValue = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return false;
    const stringValue = String(value).trim();
    return !isNaN(Number(stringValue)) && isFinite(Number(stringValue));
  };

  const parseNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return -Infinity;
    return Number(String(value).trim());
  };

  const smartSort = (data: any[], fieldName: string, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      const aValue = a.data[fieldName];
      const bValue = b.data[fieldName];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) {
        if (bValue === null || bValue === undefined) return 0;
        return direction === 'asc' ? -1 : 1;
      }
      if (bValue === null || bValue === undefined) {
        return direction === 'asc' ? 1 : -1;
      }

      // Check if both values are numeric
      const aIsNumeric = isNumericValue(aValue);
      const bIsNumeric = isNumericValue(bValue);

      if (aIsNumeric && bIsNumeric) {
        // Both are numeric - do numeric comparison
        const aNum = parseNumericValue(aValue);
        const bNum = parseNumericValue(bValue);
        const result = aNum - bNum;
        return direction === 'asc' ? result : -result;
      } else if (aIsNumeric && !bIsNumeric) {
        // Mixed types - numeric values come first in ascending order
        return direction === 'asc' ? -1 : 1;
      } else if (!aIsNumeric && bIsNumeric) {
        // Mixed types - numeric values come first in ascending order
        return direction === 'asc' ? 1 : -1;
      } else {
        // Both are non-numeric - do string comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        const result = aStr.localeCompare(bStr);
        return direction === 'asc' ? result : -result;
      }
    });
  };

  // Handle sorting
  const handleSort = (field) => {
    const newDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);

    // If we have current data and no search term, do client-side smart sorting
    if (data.length > 0 && !searchTerm && currentPage === 1 && limit >= totalCount) {
      // We have all data loaded, can do client-side sorting
      const sortedData = smartSort(data, field, newDirection);
      setData(sortedData);
    } else {
      // Fall back to server-side sorting for complex scenarios
      loadTableData(currentPage, limit, field, newDirection);
    }
  };
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    loadTableData(1, limit, sortField, sortDirection, searchTerm);
  };
  
  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    loadTableData(1, limit, sortField, sortDirection, '');
  };
  
  // Handle edit row
  const handleEditRow = (rowId, rowData) => {
    setSelectedRowId(rowId);
    setSelectedRowData(rowData);
    setShowEditModal(true);
  };
  
  // Handle delete row
  const handleDeleteRow = (rowId) => {
    setSelectedRowId(rowId);
    setShowDeleteModal(true);
  };
  
  // Handle text expansion
  const handleExpandText = (text: string, fieldName: string, rowId: string, fieldKey: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row edit modal from opening
    setExpandedText(text);
    setExpandedFieldName(fieldName);
    setExpandedRowId(rowId);
    setExpandedFieldKey(fieldKey);
    setExpandedTextModified(false);
    setShowTextModal(true);
  };
  
  // Handle HTML cleanup in the text expansion modal
  const handleCleanupExpandedText = () => {
    if (!expandedText) return;
    
    const cleanedText = cleanupHtmlText(expandedText);
    setExpandedText(cleanedText);
    setExpandedTextModified(true);
  };
  
  // Handle saving expanded text changes to the database
  const handleSaveExpandedText = async () => {
    if (!expandedRowId || !expandedFieldKey || !expandedText) return;
    
    try {
      setSavingExpandedText(true);
      
      const updatedData = { [expandedFieldKey]: expandedText };
      
      const { data, error } = await supabase.rpc('update_data_row_in_user_table', {
        p_row_id: expandedRowId,
        p_data: updatedData
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update row');
      
      // Reload the table data to reflect changes
      await loadTableData(currentPage, limit, sortField, sortDirection, searchTerm);
      
      setExpandedTextModified(false);
      setShowTextModal(false);
      
      // Reset expanded text state
      setExpandedText(null);
      setExpandedFieldName(null);
      setExpandedRowId(null);
      setExpandedFieldKey(null);
      
    } catch (err) {
      console.error('Error saving expanded text:', err);
      setError(err instanceof Error ? err.message : 'Failed to save text changes');
    } finally {
      setSavingExpandedText(false);
    }
  };
  
  // Handle manual text changes in the expanded modal
  const handleExpandedTextChange = (newText: string) => {
    setExpandedText(newText);
    setExpandedTextModified(true);
  };
  
  // Check if row ordering is enabled for this table
  const checkRowOrderingEnabled = () => {
    if (!tableInfo?.row_ordering_config) return false;
    return tableInfo.row_ordering_config.enabled === true;
  };
  
  // Get the current row order from the table config
  const getCurrentRowOrder = () => {
    if (!tableInfo?.row_ordering_config?.order) return [];
    return tableInfo.row_ordering_config.order;
  };
  
  // Update row ordering configuration
  const updateRowOrdering = async (newOrder: string[]) => {
    try {
      const { data, error } = await supabase.rpc('update_user_table_row_ordering', {
        p_table_id: tableId,
        p_enabled: true,
        p_order: newOrder
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update row order');
      
      // Reload table data to reflect new order
      await loadTableData(currentPage, limit, sortField, sortDirection, searchTerm, true);
      
    } catch (err) {
      console.error('Error updating row order:', err);
      setError(err instanceof Error ? err.message : 'Failed to update row order');
    }
  };
  
  // Enable row ordering for the table
  const enableRowOrdering = async () => {
    if (!data.length) return;
    
    // Create initial order based on current data
    const initialOrder = data.map(row => row.id);
    await updateRowOrdering(initialOrder);
    setRowOrderingEnabled(true);
  };
  
  // Disable row ordering
  const disableRowOrdering = async () => {
    try {
      const { data, error } = await supabase.rpc('update_user_table_row_ordering', {
        p_table_id: tableId,
        p_enabled: false,
        p_order: []
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to disable row ordering');
      
      setRowOrderingEnabled(false);
      await loadTableData(currentPage, limit, sortField, sortDirection, searchTerm, true);
      
    } catch (err) {
      console.error('Error disabling row ordering:', err);
      setError(err instanceof Error ? err.message : 'Failed to disable row ordering');
    }
  };
  
  // Check if any data in the current table contains cleanable HTML
  const hasCleanableHtmlInTable = () => {
    if (!data || !fields) return false;
    
    const stringFields = fields.filter(field => field.data_type === 'string');
    if (stringFields.length === 0) return false;
    
    return data.some(row => 
      stringFields.some(field => {
        const value = row.data[field.field_name];
        return value && typeof value === 'string' && containsCleanableHtml(value);
      })
    );
  };
  
  // Handle bulk HTML cleanup for all rows in the table
  const handleBulkHtmlCleanup = async () => {
    if (!data || !fields) return;
    
    try {
      setLoading(true);
      
      const stringFields = fields.filter(field => field.data_type === 'string');
      const updates = [];
      
      // Collect all rows that need cleaning
      for (const row of data) {
        const cleanedData = {};
        let hasChanges = false;
        
        for (const field of stringFields) {
          const value = row.data[field.field_name];
          if (value && typeof value === 'string' && containsCleanableHtml(value)) {
            const cleanedValue = cleanupHtmlText(value);
            if (cleanedValue !== value) {
              cleanedData[field.field_name] = cleanedValue;
              hasChanges = true;
            }
          }
        }
        
        if (hasChanges) {
          updates.push({
            rowId: row.id,
            data: cleanedData
          });
        }
      }
      
      if (updates.length === 0) {
        setError('No HTML content found to clean up');
        return;
      }
      
      // Process updates in batches to avoid overwhelming the database
      const batchSize = 10;
      let processedCount = 0;
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (update) => {
            const { data: result, error } = await supabase.rpc('update_data_row_in_user_table', {
              p_row_id: update.rowId,
              p_data: update.data
            });
            
            if (error) throw error;
            if (!result.success) throw new Error(result.error || 'Failed to update row');
            
            processedCount++;
          })
        );
      }
      
      // Reload the table data to reflect changes
      await loadTableData(currentPage, limit, sortField, sortDirection, searchTerm);
      
      // Show success message
      setError(null);
      // You could add a success toast here if you have a toast system
      console.log(`Successfully cleaned HTML in ${processedCount} rows`);
      
    } catch (err) {
      console.error('Error during bulk HTML cleanup:', err);
      setError(err instanceof Error ? err.message : 'Failed to cleanup HTML content');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle reference modal
  const handleShowReference = (rowId: string, rowData: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row edit modal from opening
    setReferenceRowId(rowId);
    setReferenceRowData(rowData);
    setShowReferenceModal(true);
  };
  
  // Add this helper function somewhere in the component, before the return statement
  const formatCellValue = (value: any, dataType: string) => {
    if (value === null || value === undefined) return { display: '—', isTruncated: false, fullText: '', hasCleanableHtml: false };
    
    // Format based on data type
    switch (dataType) {
      case 'json':
        const jsonDisplay = typeof value === 'object' ? JSON.stringify(value) : value;
        return { display: jsonDisplay, isTruncated: false, fullText: jsonDisplay, hasCleanableHtml: false };
      case 'array':
        const arrayDisplay = Array.isArray(value) ? JSON.stringify(value) : value;
        return { display: arrayDisplay, isTruncated: false, fullText: arrayDisplay, hasCleanableHtml: false };
      case 'boolean':
        const boolDisplay = value ? 'True' : 'False';
        return { display: boolDisplay, isTruncated: false, fullText: boolDisplay, hasCleanableHtml: false };
      case 'date':
      case 'datetime':
        try {
          const dateDisplay = new Date(value).toLocaleString();
          return { display: dateDisplay, isTruncated: false, fullText: dateDisplay, hasCleanableHtml: false };
        } catch (e) {
          return { display: value, isTruncated: false, fullText: value, hasCleanableHtml: false };
        }
      case 'string':
        // For string fields, handle multiline content intelligently
        const stringValue = String(value);
        const hasCleanableHtml = containsCleanableHtml(stringValue);
        const lines = stringValue.split('\n');
        
        // If multiline, show first line with indicator
        if (lines.length > 1) {
          const firstLine = lines[0];
          return { 
            display: firstLine, 
            isTruncated: true, 
            fullText: stringValue,
            hasCleanableHtml,
            multilineIndicator: `+${lines.length - 1} more lines`
          };
        }
        
        // For single line, let CSS handle truncation based on available space
        return { 
          display: stringValue, 
          isTruncated: stringValue.length > 100, // Only consider "truncated" if reasonably long
          fullText: stringValue, 
          hasCleanableHtml 
        };
      default:
        const defaultDisplay = String(value);
        const defaultHasCleanableHtml = containsCleanableHtml(defaultDisplay);
        return { 
          display: defaultDisplay, 
          isTruncated: defaultDisplay.length > 100, 
          fullText: defaultDisplay, 
          hasCleanableHtml: defaultHasCleanableHtml 
        };
    }
  };
  
  if (loading && !tableInfo) return <TableLoadingComponent />;
  if (error) return (
    <div className="py-6 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <p className="font-medium">Error: {error}</p>
      <p className="text-sm mt-1 text-red-400 dark:text-red-300">Please try again or contact support if the issue persists.</p>
    </div>
  );
  if (!tableInfo) return (
    <div className="py-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
      <p className="font-medium">No table found</p>
      <p className="text-muted-foreground mt-2">The requested table could not be found or accessed.</p>
    </div>
  );
  
  return (
    <div className="space-y-4 p-2">
      {/* Table header with optional selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{tableInfo.table_name}</h2>
          {tableInfo.description && <p className="text-gray-500 dark:text-gray-400">{tableInfo.description}</p>}
        </div>
        
        {showTableSelector && tables.length > 0 && (
          <div className="min-w-[250px]">
            <Select value={tableId} onValueChange={handleTableChange}>
              <SelectTrigger id="table-select" className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                {tables.map((table) => (
                  <SelectItem 
                    key={table.id} 
                    value={table.id}
                    className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex flex-col">
                      <span>{table.table_name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {table.row_count} rows • {table.field_count} fields
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {/* Toolbar with search */}
      <TableToolbar 
        tableId={tableId}
        tableInfo={tableInfo}
        fields={fields}
        loadTableData={(forceReload) => loadTableData(currentPage, limit, sortField, sortDirection, searchTerm, forceReload)}
        selectedRowId={selectedRowId}
        selectedRowData={selectedRowData}
        
        // Search props
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
        clearSearch={clearSearch}
        
        // Modal visibility state
        showEditModal={showEditModal}
        showDeleteModal={showDeleteModal}
        showAddColumnModal={showAddColumnModal}
        showAddRowModal={showAddRowModal}
        showExportModal={showExportModal}
        showTableSettingsModal={showTableSettingsModal}
        showReferenceOverlay={showReferenceOverlay}
        showRowOrderingModal={showRowOrderingModal}
        
        // Modal visibility state setters
        setShowEditModal={setShowEditModal}
        setShowDeleteModal={setShowDeleteModal}
        setShowAddColumnModal={setShowAddColumnModal}
        setShowAddRowModal={setShowAddRowModal}
        setShowExportModal={setShowExportModal}
        setShowTableSettingsModal={setShowTableSettingsModal}
        setShowReferenceOverlay={setShowReferenceOverlay}
        setShowRowOrderingModal={setShowRowOrderingModal}
        
        // Success callbacks
        onEditSuccess={() => {
          setShowEditModal(false);
          setSelectedRowId(null);
          setSelectedRowData(null);
          loadTableData(currentPage, limit);
        }}
        onDeleteSuccess={() => {
          setShowDeleteModal(false);
          setSelectedRowId(null);
          loadTableData(currentPage, limit);
        }}
        
        // HTML cleanup functions
        cleanupHtmlText={cleanupHtmlText}
        containsCleanableHtml={containsCleanableHtml}
        hasCleanableHtmlInTable={hasCleanableHtmlInTable()}
        handleBulkHtmlCleanup={handleBulkHtmlCleanup}
        
        // Row ordering functions
        rowOrderingEnabled={rowOrderingEnabled}
        enableRowOrdering={enableRowOrdering}
        disableRowOrdering={disableRowOrdering}
        onRowOrderingSuccess={() => {
          // Clear any active sorting when row ordering is updated
          setSortField(null);
          setSortDirection('asc');
          loadTableData(currentPage, limit, null, 'asc', searchTerm, true);
        }}
      />
      
      {/* Table */}
      <div className="border rounded-xl border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-none">
          <Table className="table-fixed w-full">
            <TableHeader className="bg-gray-100 dark:bg-gray-800">
              <TableRow>
                {fields.map((field) => (
                  <TableHead 
                    key={field.id}
                    className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-center py-3 min-w-[150px]"
                    onClick={() => handleSort(field.field_name)}
                  >
                    <div className="truncate">
                      {field.display_name}
                      {sortField === field.field_name && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[140px] text-gray-700 dark:text-gray-300 text-center py-3 flex-shrink-0">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader className="animate-spin h-5 w-5 mr-3 text-primary" />
                    Loading data...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="text-center py-8">
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow 
                  key={row.id} 
                  className={`
                    ${index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50 dark:bg-gray-900"}
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer
                  `}
                  onClick={() => handleEditRow(row.id, row.data)}
                >
                  {fields.map((field) => (
                    <TableCell key={`${row.id}-${field.id}`} className="py-3 max-w-0">
                      {row.data[field.field_name] !== null ? (() => {
                        const cellData = formatCellValue(row.data[field.field_name], field.data_type);
                        return (
                          <div className="flex items-center justify-between group min-w-0">
                            <div className="flex-1 min-w-0">
                              <div 
                                className="truncate text-left"
                                title={cellData.isTruncated ? cellData.fullText : undefined}
                              >
                                {String(cellData.display)}
                              </div>
                              {cellData.multilineIndicator && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {cellData.multilineIndicator}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                              {cellData.hasCleanableHtml && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                  onClick={(e) => handleCleanupText(field.field_name, cellData.fullText, row.id, e)}
                                  title={`Clean up HTML formatting in ${field.display_name}`}
                                >
                                  <Wand2 className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                                </Button>
                              )}
                              {cellData.isTruncated && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                  onClick={(e) => handleExpandText(cellData.fullText, field.display_name, row.id, field.field_name, e)}
                                  title={`Expand ${field.display_name}`}
                                >
                                  <Expand className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })() : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <div className="flex justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowReference(row.id, row.data, e);
                        }}
                        title="Get Reference"
                      >
                        <Link className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRow(row.id, row.data);
                        }}
                        title="Edit Row"
                      >
                        <Pencil className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(row.id);
                        }}
                        title="Delete Row"
                      >
                        <Trash className="h-4 w-4 text-red-500 dark:text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Pagination */}
      {!loading && data.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Select value={String(limit)} onValueChange={handleLimitChange}>
              <SelectTrigger className="h-8 w-[70px] bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectItem value="5" className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">5</SelectItem>
                <SelectItem value="10" className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">10</SelectItem>
                <SelectItem value="20" className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">20</SelectItem>
                <SelectItem value="50" className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">50</SelectItem>
                <SelectItem value="100" className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-4 whitespace-nowrap">
              of {totalCount} rows
            </span>
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = currentPage <= 3
                  ? i + 1
                  : currentPage + i - 2;
                
                if (pageNum > totalPages) return null;
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum)}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      
      {/* Text Expansion Modal */}
      <Dialog open={showTextModal} onOpenChange={(open) => {
        if (!open && expandedTextModified) {
          // Could add a confirmation dialog here if needed
        }
        setShowTextModal(open);
      }}>
        <DialogContent className="sm:max-w-[60vw] max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {expandedFieldName ? `${expandedFieldName} - Full Content` : 'Full Content'}
                {expandedTextModified && <span className="text-orange-500 ml-2">*</span>}
              </DialogTitle>
              {expandedText && containsCleanableHtml(expandedText) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCleanupExpandedText}
                  className="flex items-center gap-2"
                  title="Clean up HTML formatting"
                  disabled={savingExpandedText}
                >
                  <Wand2 className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                  <span className="text-sm">Clean HTML</span>
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            <Textarea
              value={expandedText || ''}
              onChange={(e) => handleExpandedTextChange(e.target.value)}
              className="min-h-[300px] resize-none font-mono text-sm"
              placeholder="No content"
              disabled={savingExpandedText}
            />
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {expandedTextModified ? 'You have unsaved changes' : 'Click to edit the content above'}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowTextModal(false)}
                disabled={savingExpandedText}
              >
                Cancel
              </Button>
              {expandedTextModified && (
                <Button 
                  onClick={handleSaveExpandedText}
                  disabled={savingExpandedText}
                >
                  {savingExpandedText ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reference Modal */}
      <TableReferenceModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        tableId={tableId}
        tableInfo={tableInfo}
        rowId={referenceRowId}
        rowData={referenceRowData}
        fields={fields}
      />
    </div>
  );
};

export default UserTableViewer;