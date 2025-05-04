'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { 
  selectAppById,
  selectAppLoading,
  selectAppName, 
  selectAppDescription,
  selectAppCreator,
  selectAppSlug,
  selectAppImageUrl,
  selectAppPrimaryColor,
  selectAppAccentColor,
  selectAppletIdsForApp
} from '@/lib/redux/app-builder/selectors/appSelectors';
import { setActiveApp } from '@/lib/redux/app-builder/slices/appBuilderSlice';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface AppViewPageProps {
  params: {
    id: string;
  };
}

export default function AppViewPage({ params }: AppViewPageProps) {
  const { id } = params;
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Get app data from Redux
  const app = useAppSelector((state) => selectAppById(state, id));
  const appName = useAppSelector((state) => selectAppName(state, id));
  const appDescription = useAppSelector((state) => selectAppDescription(state, id));
  const appCreator = useAppSelector((state) => selectAppCreator(state, id));
  const appSlug = useAppSelector((state) => selectAppSlug(state, id));
  const appImageUrl = useAppSelector((state) => selectAppImageUrl(state, id));
  const primaryColor = useAppSelector((state) => selectAppPrimaryColor(state, id));
  const accentColor = useAppSelector((state) => selectAppAccentColor(state, id));
  const appletIds = useAppSelector((state) => selectAppletIdsForApp(state, id));
  const isLoading = useAppSelector(selectAppLoading);
  
  // Set active app when component mounts
  useEffect(() => {
    if (id) {
      dispatch(setActiveApp(id));
    }
  }, [id, dispatch]);
  
  // Handle edit button click
  const handleEdit = () => {
    router.push(`/apps/app-builder/apps/${id}/edit`);
  };
  
  // Loading state
  if (isLoading || !app) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column: Details */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">App Details</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-gray-100">{appName || 'Untitled App'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</p>
                <p className="text-gray-900 dark:text-gray-100">{appSlug || 'No slug set'}</p>
              </div>
              
              {appCreator && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created by</p>
                  <p className="text-gray-900 dark:text-gray-100">{appCreator}</p>
                </div>
              )}
              
              {appDescription && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</p>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{appDescription}</p>
                </div>
              )}
              
              <div className="flex space-x-4">
                {primaryColor && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Primary Color</p>
                    <div 
                      className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 mt-1"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                )}
                
                {accentColor && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Accent Color</p>
                    <div 
                      className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 mt-1"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
        
        {/* Right column: Image and quick actions */}
        <div className="space-y-6">
          {appImageUrl && (
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Preview Image</h3>
              <div className="relative w-full h-48 rounded-md overflow-hidden">
                <Image
                  src={appImageUrl}
                  alt={appName || 'App preview'}
                  fill
                  className="object-cover"
                />
              </div>
            </Card>
          )}
          
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Quick Actions</h3>
            <div className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/apps/app-builder/apps/${id}/build`)}
                className="justify-between"
              >
                Build App
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => router.push(`/apps/app-builder/apps/${id}/preview`)}
                className="justify-between"
              >
                Preview App
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Applets section */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Associated Applets</h3>
        {appletIds && appletIds.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {appletIds.map((appletId) => (
              <Button
                key={appletId}
                variant="outline"
                className="justify-start h-auto py-3 px-4"
                onClick={() => router.push(`/apps/app-builder/applets/${appletId}`)}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm">{appletId}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">View Applet</span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No applets associated with this app yet.</p>
        )}
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/apps/app-builder/apps/${id}/applets`)}
          >
            Manage Applets
          </Button>
        </div>
      </Card>
    </div>
  );
} 