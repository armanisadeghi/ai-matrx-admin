'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { useRouter } from 'next/navigation';
import { 
  selectAllApps,
  selectAppLoading
} from '@/lib/redux/app-builder/selectors/appSelectors';
import { deleteAppThunk } from '@/lib/redux/app-builder/thunks/appBuilderThunks';
import { Button } from '@/components/ui/button';
import { Search, Eye, Pencil, AppWindow, Box, Palette, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AppBuilder } from '@/lib/redux/app-builder/types';
import StructuredSectionCard from '@/components/official/StructuredSectionCard';
import { ICON_OPTIONS } from '@/features/applet/layouts/helpers/StyledComponents';
import { DeleteConfirmationDialog } from '@/features/applet/builder/parts/DeleteConfirmationDialog';

export default function AppsListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Get apps from Redux
  const apps = useAppSelector(selectAllApps);
  const isLoading = useAppSelector(selectAppLoading);
  
  // Local state for search/filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredApps, setFilteredApps] = useState<AppBuilder[]>([]);
  const [appToDelete, setAppToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appNameToDelete, setAppNameToDelete] = useState<string>('');
  
  // Sorting state
  type SortField = 'name' | 'slug' | 'description' | 'appletCount';
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Apply search/filter and sorting whenever apps, search term, or sort params change
  useEffect(() => {
    let filtered = apps;
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(app => 
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.slug?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'slug':
          comparison = (a.slug || '').localeCompare(b.slug || '');
          break;
        case 'description':
          comparison = (a.description || '').localeCompare(b.description || '');
          break;
        case 'appletCount':
          const countA = a.appletIds?.length || 0;
          const countB = b.appletIds?.length || 0;
          comparison = countA - countB;
          break;
        default:
          comparison = (a.name || '').localeCompare(b.name || '');
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredApps(sorted);
  }, [apps, searchTerm, sortBy, sortDirection]);
  
  // Handle sort click
  const handleSortClick = (field: SortField) => {
    if (sortBy === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    return (
      <span className="ml-1 inline-block w-4 text-center">
        {sortBy === field ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
      </span>
    );
  };
  
  // Navigation handlers
  const handleViewApp = (id: string) => {
    router.push(`/apps/app-builder/apps/${id}`);
  };
  
  const handleEditApp = (id: string) => {
    router.push(`/apps/app-builder/apps/${id}/edit`);
  };
  
  // Delete handlers
  const handleDeleteClick = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click from triggering
    setAppToDelete(id);
    setAppNameToDelete(name || 'Unnamed App');
  };
  
  const handleDeleteApp = async () => {
    if (!appToDelete) return;
    
    try {
      setIsDeleting(true);
      await dispatch(deleteAppThunk(appToDelete)).unwrap();
      setAppToDelete(null);
    } catch (error) {
      console.error('Failed to delete app:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Render icon helper function
  const renderIcon = (iconName: string | undefined) => {
    if (!iconName) return <AppWindow className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    
    const IconComponent = ICON_OPTIONS[iconName];
    if (!IconComponent) return <AppWindow className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    
    return <IconComponent className="h-5 w-5 text-gray-700 dark:text-gray-300" />;
  };
  
  // Define search input for header actions
  const searchInput = (
    <div className="relative w-64">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
      <Input
        placeholder="Search apps..."
        className="pl-8"
        value={searchTerm}
        onChange={handleSearchChange}
      />
    </div>
  );
  
  return (
    <StructuredSectionCard
      title="All Apps"
      description="Manage your full applications"
      headerActions={[searchInput]}
      className="mt-4"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : apps.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <AppWindow className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Apps Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            You haven't created any apps yet. Apps are complete applications that can be used by your users.
          </p>
          <Button onClick={() => router.push('/apps/app-builder/apps/create')}>
            Create First App
          </Button>
        </div>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Icon</TableHead>
                <TableHead 
                  className="w-[200px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSortClick('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {renderSortIndicator('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-[200px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSortClick('slug')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Slug</span>
                    {renderSortIndicator('slug')}
                  </div>
                </TableHead>
                <TableHead 
                  className="hidden md:table-cell cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSortClick('description')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Description</span>
                    {renderSortIndicator('description')}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-[100px] text-center cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSortClick('appletCount')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Applets</span>
                    {renderSortIndicator('appletCount')}
                  </div>
                </TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
                <TableHead className="w-[160px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApps.map((app, index) => (
                <TableRow 
                  key={app.id} 
                  className={`group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 ${
                    index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-900/10' : ''
                  }`}
                  onClick={() => handleViewApp(app.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-center">
                      {renderIcon(app.mainAppIcon)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <span>{app.name || 'Unnamed App'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="line-clamp-1 max-w-xs">{app.slug || 'No slug'}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="line-clamp-1 max-w-xs">{app.description || 'No description'}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">
                      {app.appletIds?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {app.isDirty ? (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                        Unsaved
                      </Badge>
                    ) : app.isLocal ? (
                      <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                        Local
                      </Badge>
                    ) : app.isPublic ? (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/20">
                        Private
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewApp(app.id);
                        }}
                        className="opacity-70 group-hover:opacity-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditApp(app.id);
                        }}
                        className="opacity-70 group-hover:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => handleDeleteClick(app.id, app.name || 'Unnamed App', e)}
                        className="opacity-70 group-hover:opacity-100 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <DeleteConfirmationDialog
        open={!!appToDelete}
        onOpenChange={(open) => !open && setAppToDelete(null)}
        handleDeleteGroup={handleDeleteApp}
        loading={isDeleting}
        title={`Delete Application: ${appNameToDelete}`}
        description={`This action cannot be undone. This will permanently delete "${appNameToDelete}" and all of its configuration. Any associated applets will be disconnected from this app.`}
        deleteButtonText="Delete App"
      />
    </StructuredSectionCard>
  );
} 