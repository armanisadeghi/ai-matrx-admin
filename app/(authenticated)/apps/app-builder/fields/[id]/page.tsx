'use client';

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { 
  selectFieldById, 
  selectFieldLoading 
} from '@/lib/redux/app-builder/selectors/fieldSelectors';
import { 
  setActiveField 
} from '@/lib/redux/app-builder/slices/fieldBuilderSlice';
import { 
  fetchFieldByIdThunk 
} from '@/lib/redux/app-builder/thunks/fieldBuilderThunks';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Card,
  CardContent
} from '@/components/ui/card';

export default function FieldDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { toast } = useToast();
  
  // Get field data from Redux
  const field = useAppSelector((state) => selectFieldById(state, id));
  const isLoading = useAppSelector(selectFieldLoading);
  
  // Load field data when the component mounts
  useEffect(() => {
    const loadField = async () => {
      try {
        if (!field) {
          await dispatch(fetchFieldByIdThunk(id)).unwrap();
        }
        dispatch(setActiveField(id));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load field component',
          variant: 'destructive',
        });
        router.push('/apps/app-builder/fields');
      }
    };
    
    loadField();
    
    // Cleanup: clear active field when unmounting
    return () => {
      dispatch(setActiveField(null));
    };
  }, [id, dispatch, field, router, toast]);
  
  if (isLoading || !field) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <dl className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-gray-500 dark:text-gray-400">Name:</dt>
                <dd>{field.label}</dd>
                
                <dt className="text-gray-500 dark:text-gray-400">Type:</dt>
                <dd>{field.component}</dd>
                
                <dt className="text-gray-500 dark:text-gray-400">Description:</dt>
                <dd>{field.description || 'None'}</dd>
                
                <dt className="text-gray-500 dark:text-gray-400">Help Text:</dt>
                <dd>{field.helpText || 'None'}</dd>
                
                <dt className="text-gray-500 dark:text-gray-400">Group:</dt>
                <dd>{field.group || 'None'}</dd>
              </dl>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Field Properties</h3>
              <dl className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-gray-500 dark:text-gray-400">Required:</dt>
                <dd>{field.required ? 'Yes' : 'No'}</dd>
                
                <dt className="text-gray-500 dark:text-gray-400">Disabled:</dt>
                <dd>{field.disabled ? 'Yes' : 'No'}</dd>
                
                <dt className="text-gray-500 dark:text-gray-400">Placeholder:</dt>
                <dd>{field.placeholder || 'None'}</dd>
                
                <dt className="text-gray-500 dark:text-gray-400">Default Value:</dt>
                <dd>{field.defaultValue || 'None'}</dd>
                
                <dt className="text-gray-500 dark:text-gray-400">Public:</dt>
                <dd>{field.isPublic ? 'Yes' : 'No'}</dd>
              </dl>
            </div>
          </div>
          
          {field.options && field.options.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Options</h3>
              <ul className="space-y-2 pl-6 list-disc">
                {field.options.map((option, index) => (
                  <li key={index}>{option.label}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
} 