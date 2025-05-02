'use client';
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Search, Plus, Filter, Grid, List, ArrowUpDown, RefreshCw, LayoutIcon, CopyIcon, FileEditIcon, Trash2Icon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { 
  getAllFieldComponents, 
  deleteFieldComponent, 
  duplicateFieldComponent,
  setFieldComponentPublic 
} from '@/features/applet/builder/service/fieldComponentService';
import { FieldDefinition } from '@/features/applet/builder/builder.types';

// Define type for fieldIds
type FieldId = string;

// Define and export the ref type
export type SmartFieldsListRefType = {
  refresh: (specificFieldIds?: FieldId[]) => Promise<FieldDefinition[]>;
};

/**
 * A modern, standalone SmartFieldsList component that fetches and displays field components
 * @param {Object} props
 * @param {Function} props.onSelectField - Callback when field is selected
 * @param {boolean} props.showCreateButton - Whether to show the create button
 * @param {Function} props.onCreateField - Callback when create button is clicked
 * @param {Function} props.onEditField - Callback when edit button is clicked
 * @param {Function} props.onDuplicateField - Callback when duplicate button is clicked
 * @param {Function} props.onDeleteField - Callback when delete button is clicked
 * @param {string} props.className - Additional CSS classes
 * @param {string[]} props.fieldIds - Optional list of field IDs to fetch and display
 * @param {Function} props.onRefreshComplete - Optional callback when refresh completes
 * @param {boolean} props.hideActions - Whether to hide action buttons
 * @param {boolean} props.selectable - Whether fields are selectable
 * @param {boolean} props.multiSelect - Whether multiple fields can be selected
 * @param {string[]} props.selectedFieldIds - IDs of selected fields
 * @param {Function} props.onSelectionChange - Callback when selection changes
 */
const SmartFieldsList = forwardRef<SmartFieldsListRefType, {
  onSelectField: any,
  showCreateButton?: boolean,
  onCreateField: any,
  onEditField: any,
  onDuplicateField: any,
  onDeleteField: any,
  className?: string,
  fieldIds: any,
  onRefreshComplete: any,
  hideActions?: boolean,
  selectable?: boolean,
  multiSelect?: boolean,
  selectedFieldIds?: any[],
  onSelectionChange: any
}>(({ 
  onSelectField, 
  showCreateButton = true, 
  onCreateField,
  onEditField,
  onDuplicateField,
  onDeleteField,
  className = '',
  fieldIds,
  onRefreshComplete,
  hideActions = false,
  selectable = false,
  multiSelect = false,
  selectedFieldIds = [],
  onSelectionChange
}, ref) => {
  const { toast } = useToast();
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [filteredFields, setFilteredFields] = useState<FieldDefinition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('label-asc'); // 'label-asc', 'label-desc', 'component-asc', 'component-desc'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedFieldIds || []);
  
  // Ref to store fieldIds for comparison
  const prevFieldIdsRef = useRef<FieldId[] | undefined>(undefined);
  
  // Local field selection handling
  useEffect(() => {
    if (selectedFieldIds && selectedFieldIds.length !== selectedIds.length) {
      setSelectedIds(selectedFieldIds);
    }
  }, [selectedFieldIds]);

  // Function to load all fields
  const loadAllFields = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const fetchedFields = await getAllFieldComponents();
      setFields(fetchedFields);
      setFilteredFields(applyFiltersAndSort(fetchedFields, searchTerm, sortBy));
      return fetchedFields;
    } catch (error) {
      console.error('Failed to load fields:', error);
      toast({
        title: "Error",
        description: "Failed to load field components",
        variant: "destructive",
      });
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast, searchTerm, sortBy]);

  // Function to load specific fields by ID
  const loadFieldsByIds = useCallback(async (ids: FieldId[] | undefined, showLoading = true) => {
    if (!ids || ids.length === 0) return [];
    
    if (showLoading) setIsLoading(true);
    try {
      const allFields = await getAllFieldComponents();
      const filteredFields = allFields.filter(field => ids.includes(field.id));
      
      setFields(filteredFields);
      setFilteredFields(applyFiltersAndSort(filteredFields, searchTerm, sortBy));
      return filteredFields;
    } catch (error) {
      console.error('Failed to load specific fields:', error);
      toast({
        title: "Error",
        description: "Failed to load field components",
        variant: "destructive",
      });
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [toast, searchTerm, sortBy]);

  // Helper function to apply filters and sorting
  const applyFiltersAndSort = (fieldList: FieldDefinition[], term: string, sort: string) => {
    // First apply search term filter
    let result = fieldList;
    
    if (term.trim()) {
      const lowercaseTerm = term.toLowerCase();
      result = fieldList.filter(field => 
        field.label?.toLowerCase().includes(lowercaseTerm) || 
        field.description?.toLowerCase().includes(lowercaseTerm) ||
        field.component?.toLowerCase().includes(lowercaseTerm)
      );
    }
    
    // Then apply sorting
    switch (sort) {
      case 'label-asc':
        result.sort((a, b) => a.label?.localeCompare(b.label));
        break;
      case 'label-desc':
        result.sort((a, b) => b.label?.localeCompare(a.label));
        break;
      case 'component-asc':
        result.sort((a, b) => a.component?.localeCompare(b.component));
        break;
      case 'component-desc':
        result.sort((a, b) => b.component?.localeCompare(a.component));
        break;
      default:
        break;
    }
    
    return result;
  };
  
  // Initial load
  useEffect(() => {
    if (fieldIds && fieldIds.length > 0) {
      loadFieldsByIds(fieldIds);
      prevFieldIdsRef.current = [...fieldIds];
    } else {
      loadAllFields();
    }
  }, [loadAllFields, loadFieldsByIds, fieldIds]);
  
  // Watch for changes in fieldIds prop
  useEffect(() => {
    const prevFieldIds = prevFieldIdsRef.current;
    
    // Check if fieldIds has changed
    const hasChanged = () => {
      if (!prevFieldIds && fieldIds) return true;
      if (prevFieldIds && !fieldIds) return true;
      if (!prevFieldIds && !fieldIds) return false;
      if (prevFieldIds.length !== fieldIds?.length) return true;
      
      // Check if any ids are different - only run if fieldIds exists
      return fieldIds?.some(id => !prevFieldIds.includes(id)) || false;
    };
    
    if (hasChanged()) {
      if (fieldIds && fieldIds.length > 0) {
        loadFieldsByIds(fieldIds);
      } else {
        loadAllFields();
      }
      
      prevFieldIdsRef.current = fieldIds ? [...fieldIds] : undefined;
    }
  }, [fieldIds, loadAllFields, loadFieldsByIds]);

  // Handle search term changes
  useEffect(() => {
    setFilteredFields(applyFiltersAndSort(fields, searchTerm, sortBy));
  }, [searchTerm, fields, sortBy]);

  // Handle sort changes
  useEffect(() => {
    setFilteredFields(applyFiltersAndSort(fields, searchTerm, sortBy));
  }, [sortBy, fields, searchTerm]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
  };

  // Handle field selection
  const handleFieldSelect = (field: FieldDefinition) => {
    if (selectable) {
      if (multiSelect) {
        // Toggle selection for multi-select
        let newSelection: string[];
        if (selectedIds.includes(field.id)) {
          newSelection = selectedIds.filter(id => id !== field.id);
        } else {
          newSelection = [...selectedIds, field.id];
        }
        setSelectedIds(newSelection);
        
        if (onSelectionChange) {
          const selectedFields = fields.filter(f => newSelection.includes(f.id));
          onSelectionChange(selectedFields);
        }
      } else {
        // Single select
        const newSelection = [field.id];
        setSelectedIds(newSelection);
        
        if (onSelectionChange) {
          const selectedFields = fields.filter(f => newSelection.includes(f.id));
          onSelectionChange(selectedFields);
        }
        
        if (onSelectField) {
          onSelectField(field);
        }
      }
    } else if (onSelectField) {
      // If not selectable, just call onSelectField callback
      onSelectField(field);
    }
  };

  // Public refresh method for specific fields
  const refreshFields = async (specificFieldIds?: FieldId[]) => {
    setIsRefreshing(true);
    try {
      let refreshedFields;
      
      if (specificFieldIds && specificFieldIds.length > 0) {
        refreshedFields = await loadFieldsByIds(specificFieldIds, false);
      } else if (fieldIds && fieldIds.length > 0) {
        refreshedFields = await loadFieldsByIds(fieldIds, false);
      } else {
        refreshedFields = await loadAllFields(false);
      }
      
      if (onRefreshComplete) {
        onRefreshComplete(refreshedFields);
      }
      
      return refreshedFields;
    } catch (error) {
      console.error('Error refreshing fields:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh field data",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsRefreshing(false);
    }
  };

  // Expose the refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshFields
  }), [refreshFields]);

  // Handle manual refresh button click
  const handleRefreshClick = () => {
    refreshFields();
    toast({
      title: "Refreshing",
      description: "Updating field list...",
    });
  };

  // Get style by component type
  const getComponentStyle = (componentType: string) => {
    const types = {
      'text': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      'number': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
      'select': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
      'checkbox': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
      'radio': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
      'date': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
      'textarea': { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
      'toggle': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
      'file': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
      'richtext': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
      'multiselect': { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
      'slider': { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-800' },
      'signature': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
      'calendar': { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
      'autocomplete': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
      'color': { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
    };

    // Default to a neutral color if the component type isn't recognized
    return types[componentType.toLowerCase()] || { 
      bg: 'bg-gray-100 dark:bg-gray-900/30', 
      text: 'text-gray-700 dark:text-gray-300', 
      border: 'border-gray-200 dark:border-gray-800' 
    };
  };

  // Renders skeleton cards during loading state
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, index) => (
      <Card key={`skeleton-${index}`} className="overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="flex mt-4 space-x-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </Card>
    ));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-64 md:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            className="pl-10 pr-4 py-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSortChange('label-asc')}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('label-desc')}>
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSortChange('component-asc')}>
                Component Type (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('component-desc')}>
                Component Type (Z-A)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-2 ${viewMode === 'grid' ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-2 ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          {showCreateButton && (
            <Button 
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              size="sm"
              onClick={onCreateField}
            >
              <Plus className="h-4 w-4 mr-1" /> New Field
            </Button>
          )}
        </div>
      </div>
      
      {/* Field cards */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-3'
      }>
        {isLoading ? (
          renderSkeletons()
        ) : filteredFields.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No fields found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {searchTerm ? "Try a different search term" : "Create your first field to get started"}
            </p>
            {showCreateButton && (
              <Button 
                className="bg-indigo-500 hover:bg-indigo-600 text-white mt-4"
                onClick={onCreateField}
              >
                <Plus className="h-4 w-4 mr-2" /> Create New Field
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredFields.map(field => {
              const componentStyle = getComponentStyle(field.component);
              const isSelected = selectedIds.includes(field.id);
              
              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  layout
                  className="h-full"
                >
                  <Card 
                    className={`
                      border hover:shadow-md transition-shadow duration-200 h-full
                      ${viewMode === 'list' ? 'flex overflow-hidden' : 'overflow-hidden'}
                      ${isSelected 
                        ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900' 
                        : 'border-gray-200 dark:border-gray-700'}
                      ${selectable ? 'cursor-pointer' : ''}
                    `}
                    onClick={selectable ? () => handleFieldSelect(field) : undefined}
                  >
                    <CardContent className={`
                      ${viewMode === 'list' ? 'flex-1 p-4' : 'p-4'}
                    `}>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                          {field.label}
                        </h3>
                        <Badge 
                          className={`${componentStyle.bg} ${componentStyle.text} ${componentStyle.border} capitalize`}
                        >
                          {field.component}
                        </Badge>
                      </div>
                      
                      {field.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {field.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {field.required && (
                          <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                            Required
                          </Badge>
                        )}
                        {field.includeOther && (
                          <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                            Has "Other"
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    
                    {!hideActions && (
                      <CardFooter className={`
                        bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3
                        ${viewMode === 'list' ? 'w-auto border-l border-l-gray-200 dark:border-l-gray-700 flex items-center justify-center' : ''}
                      `}>
                        <div className="flex justify-between w-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering selection in selectable mode
                              if (onDuplicateField) onDuplicateField(field);
                            }}
                            className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                          >
                            <CopyIcon className="h-4 w-4" />
                          </Button>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering selection in selectable mode
                                if (onEditField) onEditField(field);
                              }}
                              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <FileEditIcon className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering selection in selectable mode
                                if (onDeleteField) onDeleteField(field);
                              }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2Icon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardFooter>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      
      {/* Status footer */}
      {!isLoading && filteredFields.length > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2">
          <span>
            Showing {filteredFields.length} of {fields.length} fields
            {searchTerm && ` for "${searchTerm}"`}
          </span>
          {selectable && (
            <span>
              {selectedIds.length} selected
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
SmartFieldsList.displayName = 'SmartFieldsList';

export default SmartFieldsList;