'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSqlFunctions } from '@/lib/hooks/useSqlFunctions';
import { SqlFunction } from '@/types/sql-functions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { SquareFunction, Search, RefreshCw, Plus, ArrowUpDown, Check, Shield, X } from 'lucide-react';
import SqlFunctionsList from './SqlFunctionsList';
import SqlFunctionDetail from './SqlFunctionDetail';
import SqlFunctionForm from './SqlFunctionForm';

interface SqlFunctionsContainerProps {
  initialFunctions?: SqlFunction[];
}

export default function SqlFunctionsContainer({ initialFunctions = [] }: SqlFunctionsContainerProps) {
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [customSchemaSearch, setCustomSchemaSearch] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  
  // Use the SQL functions hook
  const {
    functions,
    loading,
    error,
    isRefreshing,
    selectedFunction,
    filter,
    sort,
    refreshFunctions,
    searchFunctions,
    createFunction,
    updateFunction,
    deleteFunction,
    selectFunction,
    updateFilter,
    updateSort,
  } = useSqlFunctions({
    initialData: initialFunctions,
    defaultFilter: { schema: 'public' },
  });

  // Extract all unique schemas from functions
  const uniqueSchemas = useMemo(() => {
    const schemas = new Set<string>();
    functions.forEach(func => {
      if (func.schema) {
        schemas.add(func.schema);
      }
    });
    return Array.from(schemas).sort();
  }, [functions]);

  // Handle form submission for search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter({ name: nameSearch });
  };

  // Handle creating a new function
  const handleCreateFunction = async (definition: string) => {
    const success = await createFunction(definition);
    if (success) {
      setActiveTab('list');
    }
    return success;
  };

  // Handle updating a function
  const handleUpdateFunction = async (definition: string) => {
    const success = await updateFunction(definition);
    if (success) {
      setActiveTab('list');
      selectFunction(null);
    }
    return success;
  };

  // Handle deleting a function
  const handleDeleteFunction = async (schema: string, name: string, argumentTypes: string) => {
    const success = await deleteFunction(schema, name, argumentTypes);
    if (success) {
      selectFunction(null);
    }
    return success;
  };

  // Handle viewing function details
  const handleViewDetails = (func: SqlFunction) => {
    selectFunction(func);
  };

  // Handle creating a new function
  const handleNewFunction = () => {
    selectFunction(null);
    setActiveTab('create');
  };

  // Handle editing a function
  const handleEditFunction = (func: SqlFunction) => {
    selectFunction(func);
    setActiveTab('edit');
  };

  // Handle going back to the list
  const handleBackToList = () => {
    setActiveTab('list');
    selectFunction(null);
  };

  // Handle schema selection change
  const handleSchemaChange = (value: string) => {
    if (value === 'custom') {
      setCustomSchemaSearch(true);
      updateFilter({ schema: '' });
    } else {
      setCustomSchemaSearch(false);
      updateFilter({ schema: value === 'all' ? undefined : value });
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Calculate pagination values
  const totalPages = Math.ceil(functions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, functions.length);
  const currentFunctions = functions.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const pageNumbers = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <Card className="w-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'list' | 'create' | 'edit')}>
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-medium">
            <SquareFunction className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <span>SQL Functions Management</span>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="list" className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                Function List
              </TabsTrigger>
              {activeTab === 'create' && (
                <TabsTrigger value="create" className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                  Create Function
                </TabsTrigger>
              )}
              {activeTab === 'edit' && selectedFunction && (
                <TabsTrigger value="edit" className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                  Edit: {selectedFunction.name}
                </TabsTrigger>
              )}
            </TabsList>
            
            {activeTab !== 'list' && (
              <Button 
                onClick={handleBackToList} 
                variant="outline" 
                size="sm" 
                className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Back to List
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <TabsContent value="list" className="mt-0">
            {/* Compact search and action buttons */}
            <div className="flex flex-wrap items-end gap-3 mb-6 p-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex-1 min-w-[200px] max-w-md">
                <form onSubmit={handleSearch} className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search by name..."
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                      className="pl-9 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 h-10"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="icon"
                    className="h-10 w-10 bg-slate-700 hover:bg-slate-600 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    <Search className="h-4 w-4" />
                    <span className="sr-only">Search</span>
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleNewFunction}
                    size="icon"
                    className="h-10 w-10 bg-slate-700 hover:bg-slate-600 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">New Function</span>
                  </Button>
                  <Button 
                    type="button"
                    onClick={refreshFunctions}
                    disabled={isRefreshing || loading}
                    size="icon"
                    className="h-10 w-10 bg-slate-700 hover:bg-slate-600 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span className="sr-only">Refresh</span>
                  </Button>
                </form>
              </div>
              
              <div className="flex flex-wrap gap-3 flex-1 justify-end">
                <div className="flex items-center gap-2 w-auto">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Schema:</label>
                  <div className="w-[150px]">
                  {customSchemaSearch ? (
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Enter schema name..."
                        value={filter.schema || ''}
                        onChange={(e) => updateFilter({ schema: e.target.value })}
                        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 pr-8"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-0 top-0 h-full px-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        onClick={() => setCustomSchemaSearch(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Select 
                      value={filter.schema || 'all'} 
                      onValueChange={handleSchemaChange}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
                        <SelectValue placeholder="Select schema" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">All Schemas</SelectItem>
                        {uniqueSchemas.map(schema => (
                          <SelectItem key={schema} value={schema}>{schema}</SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Search...</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-auto">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Return:</label>
                  <div className="w-[350px]">
                  <Input
                    type="text"
                    placeholder="Filter by return type..."
                    value={filter.returnType || ''}
                    onChange={(e) => updateFilter({ returnType: e.target.value })}
                    className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                  />
                  </div>
                </div>
                <div className="flex items-center gap-2 w-auto">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Security:</label>
                  <div className="w-[150px]">
                  <Select 
                    value={filter.securityType || 'any'} 
                    onValueChange={(value) => updateFilter({ securityType: value === 'any' ? undefined : value as 'SECURITY DEFINER' | 'SECURITY INVOKER' })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="SECURITY DEFINER">Definer</SelectItem>
                      <SelectItem value="SECURITY INVOKER">Invoker</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Functions list */}
            {error ? (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 text-red-800 dark:text-red-300">
                {error.message}
              </div>
            ) : (
              <>
                <SqlFunctionsList
                  functions={currentFunctions}
                  loading={loading || isRefreshing}
                  onViewDetails={handleViewDetails}
                  onEditFunction={handleEditFunction}
                  onDeleteFunction={handleDeleteFunction}
                  onSortChange={updateSort}
                  sortField={sort.field}
                  sortDirection={sort.direction}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 grid grid-cols-3 items-center">
                    <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Showing {startIndex + 1}-{endIndex} of {functions.length} functions
                    </div>
                    
                    <div className="flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className={`cursor-pointer ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                            />
                          </PaginationItem>
                          
                          {startPage > 1 && (
                            <>
                              <PaginationItem>
                                <PaginationLink 
                                  onClick={() => setCurrentPage(1)}
                                  className="cursor-pointer"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {startPage > 2 && (
                                <PaginationItem>
                                  <span className="px-2 text-slate-400">...</span>
                                </PaginationItem>
                              )}
                            </>
                          )}
                          
                          {pageNumbers.map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink 
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          
                          {endPage < totalPages && (
                            <>
                              {endPage < totalPages - 1 && (
                                <PaginationItem>
                                  <span className="px-2 text-slate-400">...</span>
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink 
                                  onClick={() => setCurrentPage(totalPages)}
                                  className="cursor-pointer"
                                >
                                  {totalPages}
                                </PaginationLink>
                              </PaginationItem>
                            </>
                          )}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className={`cursor-pointer ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Rows per page:</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={handleItemsPerPageChange}
                      >
                        <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-0">
            <SqlFunctionForm 
              onSubmit={handleCreateFunction}
              onCancel={handleBackToList}
            />
          </TabsContent>

          <TabsContent value="edit" className="mt-0">
            {selectedFunction && (
              <SqlFunctionForm 
                functionData={selectedFunction}
                onSubmit={handleUpdateFunction}
                onCancel={handleBackToList}
              />
            )}
          </TabsContent>
        </CardContent>
      </Tabs>

      {/* Detail view (appears when a function is selected) */}
      {selectedFunction && activeTab === 'list' && (
        <div className="mt-6 px-6 pb-6">
          <SqlFunctionDetail 
            func={selectedFunction} 
            onClose={() => selectFunction(null)}
            onEdit={() => handleEditFunction(selectedFunction)}
            onDelete={() => handleDeleteFunction(
              selectedFunction.schema, 
              selectedFunction.name, 
              selectedFunction.arguments
            )}
          />
        </div>
      )}
    </Card>
  );
} 