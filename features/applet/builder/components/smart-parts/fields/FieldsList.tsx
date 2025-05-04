'use client';

import React from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldDefinition } from '@/features/applet/builder/builder.types';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { selectFieldLoading } from '@/lib/redux/app-builder/selectors/fieldSelectors';
import { deleteFieldThunk } from '@/lib/redux/app-builder/thunks/fieldBuilderThunks';
import { useToast } from '@/components/ui/use-toast';
import SectionCard from '@/features/applet/builder/modules/field-builder/components/SectionCard';
import EmptyStateCard from '@/features/applet/builder/modules/field-builder/components/EmptyStateCard';
import { ListX } from 'lucide-react';

interface FieldsListProps {
  fields: FieldDefinition[];
  title?: string;
  description?: string;
  onFieldRemoved?: () => void;
}

const FieldsList: React.FC<FieldsListProps> = ({ 
  fields, 
  title = "Configured Fields",
  description = "Fields in this group",
  onFieldRemoved
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  
  // Redux state
  const fieldLoading = useAppSelector(selectFieldLoading);

  const handleRemoveField = async (fieldId: string) => {
    if (fieldId) {
      try {
        // Delete the field
        await dispatch(deleteFieldThunk(fieldId)).unwrap();
        
        toast({
          title: "Field Removed",
          description: "Field has been removed from the container."
        });
        
        // Notify parent component if callback provided
        if (onFieldRemoved) {
          onFieldRemoved();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove field. Please try again.",
          variant: "destructive"
        });
        console.error("Error removing field:", error);
      }
    }
  };

  return (
    <SectionCard
      title={title}
      description={description}
    >
      <div className="px-1 py-2 max-h-[600px] overflow-y-auto">
        {fields.length === 0 ? (
          <EmptyStateCard
            icon={ListX}
            title="No Fields Yet"
            description="Fields you add to this container will appear here"
            buttonText={null}
          />
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div 
                key={field.id || index}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{field.label}</h4>
                      <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {field.component || 'input'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[180px]">
                      {field.placeholder || 'No placeholder'}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRemoveField(field.id)}
                    disabled={fieldLoading}
                    className="h-6 w-6 p-0 rounded-full text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                  >
                    {fieldLoading ? (
                      <span className="h-3 w-3 animate-spin">⌛</span>
                    ) : (
                      <XIcon className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default FieldsList; 