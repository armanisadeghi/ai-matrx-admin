'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { useRouter } from 'next/navigation';
import { 
  selectAllContainers,
  selectContainerLoading
} from '@/lib/redux/app-builder/selectors/containerSelectors';
import { Button } from '@/components/ui/button';
import { Search, Eye, Pencil, LayoutGrid, Box } from 'lucide-react';
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
import { ContainerBuilder } from '@/lib/redux/app-builder/types';
import StructuredSectionCard from '@/components/official/StructuredSectionCard';

export default function ContainersListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Get containers from Redux
  const containers = useAppSelector(selectAllContainers);
  const isLoading = useAppSelector(selectContainerLoading);
  
  // Local state for search/filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContainers, setFilteredContainers] = useState<ContainerBuilder[]>([]);
  
  // Apply search/filter whenever containers or search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContainers(containers);
      return;
    }
    
    const filtered = containers.filter(container => 
      container.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (container.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredContainers(filtered);
  }, [containers, searchTerm]);
  
  // Navigation handlers
  const handleViewContainer = (id: string) => {
    router.push(`/apps/app-builder/containers/${id}`);
  };
  
  const handleEditContainer = (id: string) => {
    router.push(`/apps/app-builder/containers/${id}/edit`);
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Define search input for header actions
  const searchInput = (
    <div className="relative w-64">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
      <Input
        placeholder="Search containers..."
        className="pl-8"
        value={searchTerm}
        onChange={handleSearchChange}
      />
    </div>
  );
  
  return (
    <StructuredSectionCard
      title="All Containers"
      description="Manage your reusable field containers"
      headerActions={[searchInput]}
      className="mt-4"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : containers.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Box className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Containers Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            You haven't created any containers yet. Containers let you group related fields together for use in your apps.
          </p>
          <Button onClick={() => router.push('/apps/app-builder/containers/create')}>
            Create First Container
          </Button>
        </div>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="w-[100px] text-center">Fields</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContainers.map((container) => (
                <TableRow key={container.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <LayoutGrid className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span>{container.label}</span>
                      {container.shortLabel && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({container.shortLabel})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="line-clamp-1 max-w-xs">{container.description || 'No description'}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">
                      {container.fields.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {container.isDirty ? (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                        Unsaved
                      </Badge>
                    ) : container.isLocal ? (
                      <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                        Local
                      </Badge>
                    ) : container.isPublic ? (
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
                        onClick={() => handleViewContainer(container.id)}
                        className="opacity-70 group-hover:opacity-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditContainer(container.id)}
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