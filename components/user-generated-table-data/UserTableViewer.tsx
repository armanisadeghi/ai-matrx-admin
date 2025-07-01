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
import { Search, X, Plus, Download, Settings, Pencil, Trash, Loader, Expand, Link } from 'lucide-react';
import { TableLoadingComponent } from '@/components/matrx/LoadingComponents';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [limit, setLimit] = useState(10);
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
  const [showTextModal, setShowTextModal] = useState(false);
  
  // Reference modal state
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceRowId, setReferenceRowId] = useState<string | null>(null);
  const [referenceRowData, setReferenceRowData] = useState<any>(null);
  
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
      // First load table metadata and fields
      if (!tableInfo || !fields.length || forceReload) {
        const { data: tableData, error: tableError } = await supabase
          .rpc('get_user_table_complete', { p_table_id: tableId });
          
        if (tableError) throw tableError;
        if (!tableData.success) throw new Error(tableData.error || 'Failed to load table');
        
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
      
      setData(paginatedData.data);
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
  
  // Handle sorting
  const handleSort = (field) => {
    const newDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    loadTableData(currentPage, limit, field, newDirection);
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
  const handleExpandText = (text: string, fieldName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row edit modal from opening
    setExpandedText(text);
    setExpandedFieldName(fieldName);
    setShowTextModal(true);
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
    if (value === null || value === undefined) return { display: '—', isTruncated: false, fullText: '' };
    
    // Format based on data type
    switch (dataType) {
      case 'json':
        const jsonDisplay = typeof value === 'object' ? JSON.stringify(value) : value;
        return { display: jsonDisplay, isTruncated: false, fullText: jsonDisplay };
      case 'array':
        const arrayDisplay = Array.isArray(value) ? JSON.stringify(value) : value;
        return { display: arrayDisplay, isTruncated: false, fullText: arrayDisplay };
      case 'boolean':
        const boolDisplay = value ? 'True' : 'False';
        return { display: boolDisplay, isTruncated: false, fullText: boolDisplay };
      case 'date':
      case 'datetime':
        try {
          const dateDisplay = new Date(value).toLocaleString();
          return { display: dateDisplay, isTruncated: false, fullText: dateDisplay };
        } catch (e) {
          return { display: value, isTruncated: false, fullText: value };
        }
      case 'string':
        // For string fields, show truncated content if too long or multiline
        const stringValue = String(value);
        const lines = stringValue.split('\n');
        if (lines.length > 1) {
          const firstLine = lines[0];
          const truncatedFirstLine = firstLine.length > 50 ? `${firstLine.substring(0, 50)}...` : firstLine;
          return { 
            display: `${truncatedFirstLine} (+${lines.length - 1} more)`, 
            isTruncated: true, 
            fullText: stringValue 
          };
        }
        if (stringValue.length > 50) {
          return { 
            display: `${stringValue.substring(0, 50)}...`, 
            isTruncated: true, 
            fullText: stringValue 
          };
        }
        return { display: stringValue, isTruncated: false, fullText: stringValue };
      default:
        const defaultDisplay = String(value);
        return { display: defaultDisplay, isTruncated: false, fullText: defaultDisplay };
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
        
        // Modal visibility state setters
        setShowEditModal={setShowEditModal}
        setShowDeleteModal={setShowDeleteModal}
        setShowAddColumnModal={setShowAddColumnModal}
        setShowAddRowModal={setShowAddRowModal}
        setShowExportModal={setShowExportModal}
        setShowTableSettingsModal={setShowTableSettingsModal}
        setShowReferenceOverlay={setShowReferenceOverlay}
        
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
      />
      
      {/* Table */}
      <div className="border rounded-xl border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm scrollbar-none">
        <Table>
          <TableHeader className="bg-gray-100 dark:bg-gray-800">
            <TableRow>
              {fields.map((field) => (
                <TableHead 
                  key={field.id}
                  className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-center py-3"
                  onClick={() => handleSort(field.field_name)}
                >
                  {field.display_name}
                  {sortField === field.field_name && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
              ))}
              <TableHead className="w-[140px] text-gray-700 dark:text-gray-300 text-center py-3">Actions</TableHead>
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
                    <TableCell key={`${row.id}-${field.id}`} className="py-3">
                      {row.data[field.field_name] !== null ? (() => {
                        const cellData = formatCellValue(row.data[field.field_name], field.data_type);
                        return (
                          <div className="flex items-center justify-between group">
                            <span className="flex-1">{String(cellData.display)}</span>
                            {cellData.isTruncated && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 p-0"
                                onClick={(e) => handleExpandText(cellData.fullText, field.display_name, e)}
                                title={`Expand ${field.display_name}`}
                              >
                                <Expand className="h-3 w-3" />
                              </Button>
                            )}
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
      <Dialog open={showTextModal} onOpenChange={setShowTextModal}>
        <DialogContent className="sm:max-w-[60vw] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {expandedFieldName ? `${expandedFieldName} - Full Content` : 'Full Content'}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border">
              <pre className="whitespace-pre-wrap text-sm font-mono break-words">
                {expandedText}
              </pre>
            </div>
          </div>
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