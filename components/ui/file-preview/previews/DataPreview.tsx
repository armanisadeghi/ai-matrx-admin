"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileSpreadsheet, FileJson, Database, AlertTriangle, 
  Search, Filter, ArrowUpDown, ChevronDown, Download, Copy
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface DataPreviewProps {
  file: {
    url: string;
    blob?: Blob | null;
    type: string;
    details?: any;
  };
  isLoading: boolean;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-between py-2 px-4 border-t border-border">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-textured text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-textured text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const DataPreview: React.FC<DataPreviewProps> = ({ file, isLoading }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  
  const ROWS_PER_PAGE = 15;
  
  useEffect(() => {
    const loadData = async () => {
      if (!file.url || isLoading) return;
      
      setDataLoading(true);
      setError(null);
      
      try {
        const extension = file.details?.extension?.toLowerCase();
        
        if (extension === 'json') {
          const response = await fetch(file.url);
          const jsonData = await response.json();
          
          // If it's an array, treat each item as a row
          if (Array.isArray(jsonData)) {
            setData(jsonData);
          } else {
            // For objects, try to find an array property or just use the object itself
            const possibleArrays = Object.values(jsonData).filter(Array.isArray);
            if (possibleArrays.length > 0) {
              setData(possibleArrays[0]);
            } else {
              setData([jsonData]);
            }
          }
        } 
        else if (extension === 'csv') {
          const response = await fetch(file.url);
          const text = await response.text();
          
          // Use Papa Parse for proper CSV parsing
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              setData(results.data);
            },
            error: (error) => {
              setError(`Failed to parse CSV: ${error.message}`);
            }
          });
        }
        else if (['xlsx', 'xls'].includes(extension)) {
          try {
            let arrayBuffer;
            
            if (file.blob) {
              arrayBuffer = await file.blob.arrayBuffer();
            } else {
              const response = await fetch(file.url);
              arrayBuffer = await response.arrayBuffer();
            }
            
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheets = workbook.SheetNames;
            setSheetNames(sheets);
            
            if (sheets.length > 0) {
              const firstSheet = sheets[0];
              setActiveSheet(firstSheet);
              
              // Convert sheet to JSON
              const worksheet = workbook.Sheets[firstSheet];
              const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              
              // Process sheet data: first row as headers, rest as data
              if (sheetData.length > 0) {
                const headers = sheetData[0] as string[];
                const rows = sheetData.slice(1).map((row: any[]) => {
                  const rowData: Record<string, any> = {};
                  headers.forEach((header: string, index: number) => {
                    rowData[header] = row[index];
                  });
                  return rowData;
                });
                
                setData(rows);
              } else {
                setData([]);
              }
            } else {
              setError('No sheets found in the Excel file');
            }
          } catch (err) {
            console.error('Excel parse error:', err);
            setError(`Failed to parse Excel file: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        else {
          setError(`Preview for ${extension} files is not supported.`);
        }
      } catch (err) {
        console.error('Error loading data file:', err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [file.url, isLoading, file.details?.extension, file.blob]);
  
  const handleSheetChange = async (sheetName: string) => {
    if (!file.url || isLoading || !sheetNames.includes(sheetName)) return;
    
    setDataLoading(true);
    setActiveSheet(sheetName);
    
    try {
      const extension = file.details?.extension?.toLowerCase();
      
      if (['xlsx', 'xls'].includes(extension)) {
        let arrayBuffer;
        
        if (file.blob) {
          arrayBuffer = await file.blob.arrayBuffer();
        } else {
          const response = await fetch(file.url);
          arrayBuffer = await response.arrayBuffer();
        }
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Convert sheet to JSON
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Process sheet data
        if (sheetData.length > 0) {
          const headers = sheetData[0] as string[];
          const rows = sheetData.slice(1).map((row: any[]) => {
            const rowData: Record<string, any> = {};
            headers.forEach((header: string, index: number) => {
              rowData[header] = row[index];
            });
            return rowData;
          });
          
          setData(rows);
        } else {
          setData([]);
        }
      }
    } catch (err) {
      console.error('Error changing sheet:', err);
      setError(`Failed to load sheet: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDataLoading(false);
    }
  };
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Use useMemo to process the data only when dependencies change, not on every render
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return { filteredData: [], totalRows: 0 };
    
    let filteredData = [...data];
    
    // Apply search filter if present
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredData = filteredData.filter(row => {
        return Object.values(row).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(term);
        });
      });
    }
    
    // Apply sorting if a column is selected
    if (sortColumn) {
      filteredData.sort((a, b) => {
        const valueA = a[sortColumn];
        const valueB = b[sortColumn];
        
        // Handle undefined or null values
        if (valueA === undefined || valueA === null) return sortDirection === 'asc' ? -1 : 1;
        if (valueB === undefined || valueB === null) return sortDirection === 'asc' ? 1 : -1;
        
        // Sort based on type
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
          const strA = String(valueA).toLowerCase();
          const strB = String(valueB).toLowerCase();
          return sortDirection === 'asc' 
            ? strA.localeCompare(strB) 
            : strB.localeCompare(strA);
        }
      });
    }
    
    return { 
      filteredData, 
      totalRows: filteredData.length 
    };
  }, [data, searchTerm, sortColumn, sortDirection]);
  
  // Get paginated data based on the processed data
  const displayData = useMemo(() => {
    const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
    return processedData.filteredData.slice(startIdx, startIdx + ROWS_PER_PAGE);
  }, [processedData, currentPage, ROWS_PER_PAGE]);
  
  // Get headers from the first row if data exists
  const headers = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(processedData.totalRows / ROWS_PER_PAGE));
  }, [processedData.totalRows, ROWS_PER_PAGE]);
  
  const copyToClipboard = () => {
    if (!data) return;
    
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        alert('Data copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  if (isLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-textured">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="text-gray-600 dark:text-gray-300">Loading data...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-textured">
        <AlertTriangle className="text-amber-500 h-12 w-12 mb-4" />
        <div className="text-red-500 dark:text-red-400 text-lg font-medium mb-2">Error Loading Data</div>
        <div className="text-gray-600 dark:text-gray-300 text-center max-w-md">{error}</div>
      </div>
    );
  }
  
  const renderJsonData = () => {
    if (!data) return null;
    
    return (
      <div className="h-full flex flex-col bg-textured">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FileJson className="h-5 w-5 text-blue-500" />
            <span className="font-medium text-gray-700 dark:text-gray-200">JSON Data</span>
          </div>
          <button 
            onClick={copyToClipboard} 
            className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400"
          >
            <Copy className="h-4 w-4" />
            <span>Copy</span>
          </button>
        </div>
        <div className="overflow-auto p-4 h-full w-full bg-gray-50 dark:bg-gray-900 font-mono">
          <pre className="text-sm text-gray-800 dark:text-gray-200">{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    );
  };
  
  const renderTabularData = () => {
    if (!headers.length) {
      return (
        <div className="flex items-center justify-center h-full p-6 bg-textured">
          <div className="text-gray-500 dark:text-gray-400">No data available</div>
        </div>
      );
    }
    
    const extension = file.details?.extension?.toLowerCase();
    
    return (
      <div className="h-full flex flex-col bg-textured">
        {/* Header with controls */}
        <div className="border-b border-border bg-gray-50 dark:bg-gray-900 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left section: File info */}
            <div className="flex items-center space-x-3">
              {extension === 'csv' ? (
                <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-500" />
              ) : (
                <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-500" />
              )}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {extension.toUpperCase()} {sheetNames.length > 0 ? 'Workbook' : 'Data'}
              </span>
              
              {sheetNames.length > 0 && (
                <div className="relative inline-block">
                  <select
                    value={activeSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="appearance-none bg-textured border border-gray-300 dark:border-gray-600 rounded-md py-1 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {sheetNames.map(sheet => (
                      <option key={sheet} value={sheet}>{sheet}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Right section: Search */}
            <div className="flex items-center space-x-1 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className="pl-8 pr-3 py-1 w-48 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-textured text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Table content */}
        <div className="overflow-auto flex-grow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
              <tr>
                {headers.map((header, index) => (
                  <th 
                    key={index} 
                    className="px-4 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-100 font-medium text-sm"
                  >
                    <button 
                      className="flex items-center space-x-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                      onClick={() => handleSort(header)}
                    >
                      <span>{header}</span>
                      {sortColumn === header && (
                        <ArrowUpDown className={`h-3 w-3 ${
                          sortDirection === 'asc' ? 'text-indigo-500' : 'text-indigo-500 transform rotate-180'
                        }`} />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-textured">
              {displayData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {headers.map((header, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className="border-b border-border px-4 py-2 text-gray-700 dark:text-gray-300 text-sm"
                      title={String(row[header] ?? '')}
                    >
                      {row[header] === null || row[header] === undefined ? 
                        <span className="text-gray-400 dark:text-gray-500">—</span> : 
                        String(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      </div>
    );
  };
  
  const extension = file.details?.extension?.toLowerCase();
  
  switch (extension) {
    case 'json':
      return renderJsonData();
    case 'csv':
    case 'xlsx':
    case 'xls':
      return renderTabularData();
    default:
      return (
        <div className="flex items-center justify-center h-full bg-textured">
          <div className="text-gray-500 dark:text-gray-400">
            Preview not available for this data format
          </div>
        </div>
      );
  }
};

export default DataPreview;