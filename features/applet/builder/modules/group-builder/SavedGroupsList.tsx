'use client';

import React from 'react';
import { PlusIcon, RefreshCwIcon, LayersIcon } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComponentGroup } from '../../builder.types';


interface SavedGroupsListProps {
  loading: boolean;
  savedGroups: ComponentGroup[];
  setActiveTab: (tab: string) => void;
  editGroup: (group: ComponentGroup) => void;
  confirmDeleteGroup: (id: string) => void;
  openRefreshDialog: (groupId: string) => void;
}

export const SavedGroupsList: React.FC<SavedGroupsListProps> = ({
  loading,
  savedGroups,
  setActiveTab,
  editGroup,
  confirmDeleteGroup,
  openRefreshDialog,
}) => {
  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 dark:border-amber-400"></div>
        </div>
      ) : savedGroups.length === 0 ? (
        <div className="text-center py-8">
          <LayersIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No groups</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new group
          </p>
          <div className="mt-6">
            <Button
              onClick={() => setActiveTab('create')}
              className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedGroups.map(group => (
            <Card key={group.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {group.label}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                  {group.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {group.description && (
                    <p className="mb-2 truncate">{group.description}</p>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <p><span className="font-medium">Fields:</span> {group.fields.length}</p>
                    {group.fields.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRefreshDialog(group.id)}
                        className="h-7 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        title="Refresh fields"
                      >
                        <RefreshCwIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {group.isPublic && (
                    <p className="mb-1">
                      <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                        Public
                      </span>
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirmDeleteGroup(group.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editGroup(group)}
                  className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}; 