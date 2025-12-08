'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import {
  selectAppletById,
  selectAppletIsDirty,
  selectAppletLoading
} from '@/lib/redux/app-builder/selectors/appletSelectors';
import { saveAppletThunk } from '@/lib/redux/app-builder/thunks/appletBuilderThunks';
import { setActiveApplet } from '@/lib/redux/app-builder/slices/appletBuilderSlice';
import { Button } from '@/components/ui/button';
import { AppletFormComponent } from '@/features/applet/builder/modules/smart-parts/applets/AppletFormComponent';
import { useToast } from '@/components/ui/use-toast';
import { Save, X, Loader2 } from 'lucide-react';

interface AppletEditorProps {
  appletId: string;
  isCreatingNew?: boolean;
  onSaveSuccess?: (appletId: string) => void;
  onCancel?: () => void;
}

const AppletEditor: React.FC<AppletEditorProps> = ({
  appletId,
  isCreatingNew = false,
  onSaveSuccess,
  onCancel
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  
  // Get applet data from Redux
  const applet = useAppSelector(state => selectAppletById(state, appletId));
  const isDirty = useAppSelector(state => selectAppletIsDirty(state, appletId));
  const isLoading = useAppSelector(selectAppletLoading);
  
  // Handle saving the applet
  const handleSave = async () => {
    if (!appletId) return;
    
    try {
      await dispatch(saveAppletThunk(appletId)).unwrap();
      toast({
        title: "Success",
        description: `Applet ${isCreatingNew ? 'created' : 'updated'} successfully.`
      });
      
      if (onSaveSuccess) {
        onSaveSuccess(appletId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isCreatingNew ? 'create' : 'update'} applet.`,
        variant: "destructive"
      });
    }
  };
  
  // Handle cancel button
  const handleCancelClick = () => {
    // Clean up active applet
    dispatch(setActiveApplet(null));
    
    if (onCancel) {
      onCancel();
    }
  };
  
  if (!applet) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Main Form Content */}
      <AppletFormComponent 
        appletId={appletId} 
        isNew={isCreatingNew}
      />
      
      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={handleCancelClick}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={isLoading || !isDirty}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isCreatingNew ? 'Create Applet' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default AppletEditor; 