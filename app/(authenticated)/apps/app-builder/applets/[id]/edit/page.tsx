'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { 
  selectAppletById, 
  selectAppletLoading,
  selectHasUnsavedAppletChanges
} from '@/lib/redux/app-builder/selectors/appletSelectors';
import { 
  setActiveApplet
} from '@/lib/redux/app-builder/slices/appletBuilderSlice';
import { setActiveAppletWithFetchThunk } from '@/lib/redux/app-builder/thunks/appletBuilderThunks';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import AppletEditor from '@/features/applet/builder/modules/applet-builder/AppletEditor';

interface AppletEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AppletEditPage({ params }: AppletEditPageProps) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { toast } = useToast();
  
  // Get the applet data from Redux
  const applet = useAppSelector((state) => selectAppletById(state, id));
  const isLoading = useAppSelector(selectAppletLoading);
  const hasUnsavedChanges = useAppSelector(selectHasUnsavedAppletChanges);
  
  // Set the active applet when the component loads
  useEffect(() => {
    if (id) {
      dispatch(setActiveAppletWithFetchThunk(id));
    }
    
    // Clean up when unmounting
    return () => {
      // Optional: reset active applet when navigating away
      // dispatch(setActiveApplet(null));
    };
  }, [id, dispatch]);
  
  // Handle save success - navigate to the applet view
  const handleSaveSuccess = (appletId: string) => {
    router.push(`/apps/app-builder/applets/${appletId}`);
    toast({
      title: "Success",
      description: "Applet saved successfully",
    });
  };
  
  // Handle cancel - go back to applets list or view
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        router.push(`/apps/app-builder/applets/${id}`);
      }
    } else {
      router.push(`/apps/app-builder/applets/${id}`);
    }
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
    <div className="space-y-6">
      <AppletEditor 
        appletId={id}
        isCreatingNew={false}
        onSaveSuccess={handleSaveSuccess}
        onCancel={handleCancel}
      />
      <Toaster />
    </div>
  );
} 