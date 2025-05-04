'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { 
  selectActiveFieldId
} from '@/lib/redux/app-builder/selectors/fieldSelectors';
import { 
  startFieldCreation 
} from '@/lib/redux/app-builder/slices/fieldBuilderSlice';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import FieldEditor from '@/features/applet/builder/modules/field-builder/FieldEditor';

export default function FieldCreatePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { toast } = useToast();
  
  // Get the active field ID from Redux
  const activeFieldId = useAppSelector(selectActiveFieldId);
  
  // Initialize field creation if there's no active field
  useEffect(() => {
    if (!activeFieldId) {
      // Generate a new UUID for the field
      const newId = uuidv4();
      
      // Start field creation in Redux
      dispatch(startFieldCreation({ id: newId }));
    }
  }, [activeFieldId, dispatch]);
  
  // Handle save success - navigate to the field view
  const handleSaveSuccess = (fieldId: string) => {
    router.push(`/apps/app-builder/fields/${fieldId}`);
  };
  
  // Handle cancel - go back to fields list
  const handleCancel = () => {
    router.push('/apps/app-builder/fields');
  };
  
  // If no active field ID yet, show loading
  if (!activeFieldId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <FieldEditor 
        fieldId={activeFieldId}
        isCreatingNew={true}
        onSaveSuccess={handleSaveSuccess}
        onCancel={handleCancel}
      />
      <Toaster />
    </div>
  );
} 