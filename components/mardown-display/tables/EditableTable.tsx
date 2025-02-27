"use client";
import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

// Import the CSS
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// Register modules - must be done before using AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

import { Button } from "@/components/ui/button";
import { Download, Copy, Save, PlusCircle, X } from "lucide-react";
import { useToastManager } from "@/hooks/useToastManager";
import { THEMES } from "../themes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const EditableTable = ({ 
  data, 
  theme = "professional", 
  fontSize = 16,
  onSave,
  className = "" 
}) => {
  const gridRef = useRef(null);
  const toast = useToastManager();
  const tableTheme = THEMES[theme].table || THEMES.professional.table;
  
  const [newColumnName, setNewColumnName] = useState("");
  const [showNewColumnInput, setShowNewColumnInput] = useState(false);
  
  // Create column definitions from headers
  const initialColumnDefs = useMemo(() => {
    console.log("Creating column defs from headers:", data.headers);
    return data.headers.map((header, index) => {
      const cleanHeader = typeof header === 'string' ? header.replace(/\*\*/g, "").trim() : '';
      const fieldId = `col_${index}`;
      
      return {
        headerName: cleanHeader,
        field: fieldId,
        editable: true,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
        cellStyle: { fontSize: `${fontSize}px` },
      };
    });
  }, [data.headers, fontSize]);
  
  // Transform markdown table data to AG Grid format
  const initialRowData = useMemo(() => {
    console.log("Creating row data from rows:", data.rows);
    return data.rows.map((row, rowIndex) => {
      const rowObj = { id: `row_${rowIndex}` };
      row.forEach((cell, cellIndex) => {
        const cellValue = typeof cell === 'string' ? cell.replace(/\*\*/g, "").trim() : '';
        rowObj[`col_${cellIndex}`] = cellValue;
      });
      return rowObj;
    });
  }, [data.rows]);
  
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  
  // Set the initial data after component mounts
  useEffect(() => {
    console.log("Setting initial row data and column defs");
    setRowData(initialRowData);
    setColumnDefs(initialColumnDefs);
  }, [initialRowData, initialColumnDefs]);
  
  // Default column settings
  const defaultColDef = useMemo(() => ({
    flex: 1,
    editable: true,
    resizable: true,
  }), []);
  
  // AG Grid theme based on your current theme
  const gridTheme = useMemo(() => {
    // Map your theme to AG Grid styling
    const isDark = tableTheme.header.includes("dark");
    return isDark ? "ag-theme-alpine-dark" : "ag-theme-alpine";
  }, [tableTheme]);
  
  // Style object with correct typing for CSS variables
  const gridStyles = useMemo(() => {
    const styles = {
      height: '400px',
      width: '100%',
    } as React.CSSProperties;
    
    if (tableTheme.header?.includes('bg-') && tableTheme.header.match(/bg-([a-z0-9-]+)/)?.[1]) {
      styles['--ag-header-background-color' as any] = 
        `var(--${tableTheme.header.match(/bg-([a-z0-9-]+)/)[1]})`;
    }
    
    if (tableTheme.headerText?.includes('text-') && tableTheme.headerText.match(/text-([a-z0-9-]+)/)?.[1]) {
      styles['--ag-header-foreground-color' as any] = 
        `var(--${tableTheme.headerText.match(/text-([a-z0-9-]+)/)[1]})`;
    }
    
    if (tableTheme.row?.hover?.includes('hover:bg-') && tableTheme.row.hover.match(/hover:bg-([a-z0-9-]+)/)?.[1]) {
      styles['--ag-row-hover-color' as any] = 
        `var(--${tableTheme.row.hover.match(/hover:bg-([a-z0-9-]+)/)[1]})`;
    }
    
    if (tableTheme.row?.odd?.includes('bg-') && tableTheme.row.odd.match(/bg-([a-z0-9-]+)/)?.[1]) {
      styles['--ag-odd-row-background-color' as any] = 
        `var(--${tableTheme.row.odd.match(/bg-([a-z0-9-]+)/)[1]})`;
    }
    
    if (tableTheme.row?.even?.includes('bg-') && tableTheme.row.even.match(/bg-([a-z0-9-]+)/)?.[1]) {
      styles['--ag-even-row-background-color' as any] = 
        `var(--${tableTheme.row.even.match(/bg-([a-z0-9-]+)/)[1]})`;
    }
    
    return styles;
  }, [tableTheme]);
  
  // Add new row
  const addNewRow = useCallback(() => {
    const emptyRow = { id: `row_${rowData.length}` };
    columnDefs.forEach(col => {
      if (col.field !== 'id') {
        emptyRow[col.field] = "";
      }
    });
    
    setRowData(prevRows => [...prevRows, emptyRow]);
    toast.success("New row added");
  }, [columnDefs, rowData.length, toast]);
  
  // Add new column
  const addNewColumn = useCallback(() => {
    if (!newColumnName.trim()) {
      toast.error("Column name cannot be empty");
      return;
    }
    
    // Create a new field ID
    const fieldId = `col_${columnDefs.length}`;
    
    // Add column definition
    const newColDef = {
      headerName: newColumnName.trim(),
      field: fieldId,
      editable: true,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
      cellStyle: { fontSize: `${fontSize}px` },
    };
    
    setColumnDefs(prevCols => [...prevCols, newColDef]);
    
    // Add empty data for new column to all rows
    setRowData(prevRows => 
      prevRows.map(row => ({
        ...row,
        [fieldId]: ""
      }))
    );
    
    setNewColumnName("");
    setShowNewColumnInput(false);
    toast.success("New column added");
  }, [newColumnName, columnDefs, fontSize, toast]);
  
  // Export to CSV
  const exportCSV = useCallback(() => {
    try {
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: "table_data.csv",
          skipColumnHeaders: false,
          columnKeys: columnDefs.map(col => col.field).filter(field => field !== 'id')
        });
        toast.success("Table exported to CSV");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to export CSV");
    }
  }, [columnDefs, toast]);
  
  // Copy table to clipboard
  const copyTableToClipboard = useCallback(async () => {
    try {
      if (gridRef.current && gridRef.current.api) {
        const csvData = gridRef.current.api.getDataAsCsv({
          suppressQuotes: false,
          columnKeys: columnDefs.map(col => col.field).filter(field => field !== 'id')
        });
        await navigator.clipboard.writeText(csvData);
        toast.success("Table copied to clipboard");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to copy table");
    }
  }, [columnDefs, toast]);
  
  // Log grid ready event
  const onGridReady = useCallback((params) => {
    console.log("Grid ready!", params);
  }, []);
  
  // Save current table data
  const saveTableData = useCallback(() => {
    try {
      if (!onSave) {
        toast.warning("Save handler not provided");
        return;
      }
      
      // Convert back to markdown format
      const headers = columnDefs
        .filter(col => col.field !== 'id')
        .map(col => col.headerName);
      
      const rows = rowData.map(row => 
        columnDefs
          .filter(col => col.field !== 'id')
          .map(col => row[col.field] || "")
      );
      
      onSave({ headers, rows });
      toast.success("Table data saved");
    } catch (err) {
      toast.error(err?.message || "Failed to save data");
    }
  }, [columnDefs, rowData, onSave, toast]);

  console.log("RENDER - Row data:", rowData);
  console.log("RENDER - Column defs:", columnDefs);
  
  return (
    <div className="w-full space-y-4 my-4">
      {/* Column management */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowNewColumnInput(true)}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Column
          </Button>
          
          {showNewColumnInput && (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name"
                className="w-48"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNewColumn();
                  if (e.key === 'Escape') {
                    setNewColumnName("");
                    setShowNewColumnInput(false);
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={addNewColumn}
                className="flex items-center gap-1"
              >
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setNewColumnName("");
                  setShowNewColumnInput(false);
                }}
                className="flex items-center"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addNewRow} 
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Row
        </Button>
      </div>
      
      {/* AG Grid */}
      <div className={cn("rounded-xl border-3 overflow-hidden", tableTheme.border)}>
        <div
          className={cn(gridTheme, className)}
          style={gridStyles}
        >
          {/* Debugging info - display only in development */}
          {process.env.NODE_ENV === 'development' && rowData.length === 0 && (
            <div className="p-4 text-red-500">
              No data available! Check console for errors.
            </div>
          )}
          
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={true}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            pagination={true}
            paginationAutoPageSize={true}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            getRowId={(params) => params.data.id}
            onGridReady={onGridReady}
            suppressFieldDotNotation={true}
            debounceVerticalScrollbar={true}
          />
        </div>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyTableToClipboard} 
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy Table
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportCSV} 
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={saveTableData} 
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default EditableTable;