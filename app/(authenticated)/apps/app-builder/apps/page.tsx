'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { useRouter } from 'next/navigation';
import { 
  selectAllApps,
  selectAppLoading
} from '@/lib/redux/app-builder/selectors/appSelectors';
import { Button } from '@/components/ui/button';
import { Search, Eye, Pencil, AppWindow, Box, Palette } from 'lucide-react';
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

export default function AppsListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Get apps from Redux
  const apps = useAppSelector(selectAllApps);
  const isLoading = useAppSelector(selectAppLoading);
  
  // Local state for search/filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredApps, setFilteredApps] = useState<AppBuilder[]>([]);
  
  // Apply search/filter whenever apps or search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredApps(apps);
      return;
    }
    
    const filtered = apps.filter(app => 
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.slug?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredApps(filtered);
  }, [apps, searchTerm]);
  
  // Navigation handlers
  const handleViewApp = (id: string) => {
    router.push(`/apps/app-builder/apps/${id}`);
  };
  
  const handleEditApp = (id: string) => {
    router.push(`/apps/app-builder/apps/${id}/edit`);
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
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[200px]">Slug</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="w-[100px] text-center">Applets</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApps.map((app) => (
                <TableRow key={app.id} className="group">
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
                        onClick={() => handleViewApp(app.id)}
                        className="opacity-70 group-hover:opacity-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditApp(app.id)}
                        className="opacity-70 group-hover:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </StructuredSectionCard>
  );
} 