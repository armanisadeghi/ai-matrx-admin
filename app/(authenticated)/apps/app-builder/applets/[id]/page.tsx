'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { 
  selectAppletById,
  selectAppletLoading,
  selectAppletName, 
  selectAppletDescription,
  selectAppletCreator,
  selectAppletSlug,
  selectAppletImageUrl,
  selectAppletPrimaryColor,
  selectAppletAccentColor
} from '@/lib/redux/app-builder/selectors/appletSelectors';
import { setActiveApplet } from '@/lib/redux/app-builder/slices/appletBuilderSlice';
import { setActiveAppletWithFetchThunk } from '@/lib/redux/app-builder/thunks/appletBuilderThunks';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { toast } from '@/components/ui/use-toast';

export default function AppletViewPage({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;

  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Get applet data from Redux
  const applet = useAppSelector((state) => selectAppletById(state, id));
  const appletName = useAppSelector((state) => selectAppletName(state, id));
  const appletDescription = useAppSelector((state) => selectAppletDescription(state, id));
  const appletCreator = useAppSelector((state) => selectAppletCreator(state, id));
  const appletSlug = useAppSelector((state) => selectAppletSlug(state, id));
  const appletImageUrl = useAppSelector((state) => selectAppletImageUrl(state, id));
  const primaryColor = useAppSelector((state) => selectAppletPrimaryColor(state, id));
  const accentColor = useAppSelector((state) => selectAppletAccentColor(state, id));
  const isLoading = useAppSelector(selectAppletLoading);
  
  // Set active applet when component mounts
  useEffect(() => {
    if (id) {
      dispatch(setActiveAppletWithFetchThunk(id)).unwrap()
        .catch(error => {
          console.error("Failed to set active applet:", error);
          toast({
            title: "Error",
            description: "Failed to set active applet.",
            variant: "destructive",
          });
        });
    }
  }, [id, dispatch]);
  
  // Handle edit button click
  const handleEdit = () => {
    router.push(`/apps/app-builder/applets/${id}/edit`);
  };
  
  // Loading state
  if (isLoading || !applet) {
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
            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Applet Details</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-gray-100">{appletName || 'Untitled Applet'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</p>
                <p className="text-gray-900 dark:text-gray-100">{appletSlug || 'No slug set'}</p>
              </div>
              
              {appletCreator && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created by</p>
                  <p className="text-gray-900 dark:text-gray-100">{appletCreator}</p>
                </div>
              )}
              
              {appletDescription && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</p>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{appletDescription}</p>
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
          {appletImageUrl && (
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Preview Image</h3>
              <div className="relative w-full h-48 rounded-md overflow-hidden">
                <Image
                  src={appletImageUrl}
                  alt={appletName || 'Applet preview'}
                  fill
                  className="object-cover"
                />
              </div>
            </Card>
          )}
        </div>
      </div>
      
      {/* Placeholder for future sections like associated containers, etc. */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Containers</h3>
        <p className="text-gray-500 dark:text-gray-400">
          This applet has {applet.containers?.length || 0} containers.
        </p>
      </Card>
    </div>
  );
} 