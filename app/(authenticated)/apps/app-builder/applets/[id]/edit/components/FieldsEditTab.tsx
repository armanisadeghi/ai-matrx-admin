'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FieldDefinition, AppletContainer } from '../../page';

interface FieldsEditTabProps {
  containers?: AppletContainer[];
  onUpdate: (containers: AppletContainer[]) => void;
}

export default function FieldsEditTab({ containers = [], onUpdate }: FieldsEditTabProps) {
  // Flatten all fields from all containers
  const allFields = containers?.reduce<{field: FieldDefinition, containerIndex: number, fieldIndex: number}[]>((acc, container, containerIndex) => {
    if (container.fields?.length) {
      return [
        ...acc, 
        ...container.fields.map((field, fieldIndex) => ({
          field,
          containerIndex,
          fieldIndex
        }))
      ];
    }
    return acc;
  }, []) || [];

  const [editingField, setEditingField] = useState<{field: FieldDefinition, containerIndex: number, fieldIndex: number} | null>(null);

  const handleEditField = (field: FieldDefinition, containerIndex: number, fieldIndex: number) => {
    setEditingField({ field, containerIndex, fieldIndex });
    // In a real implementation, this would open a modal or form for editing
    console.log("Edit field:", field);
  };

  const handleDeleteField = (containerIndex: number, fieldIndex: number) => {
    if (confirm("Are you sure you want to delete this field?")) {
      const newContainers = [...containers];
      newContainers[containerIndex].fields.splice(fieldIndex, 1);
      onUpdate(newContainers);
    }
  };

  const handleAddField = () => {
    // In a real implementation, this would open a modal or form for adding a field
    console.log("Add new field");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Total fields: {allFields.length}
        </p>
        <Button 
          onClick={handleAddField}
          size="sm"
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {allFields.length === 0 ? (
        <Card className="p-4">
          <p className="text-gray-500 dark:text-gray-400">No fields defined for this applet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {allFields.map(({ field, containerIndex, fieldIndex }) => (
            <Card key={field.id} className="p-4 border-l-4 border-indigo-500 dark:border-indigo-400">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center flex-wrap gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{field.label}</h4>
                  {field.required && (
                    <Badge className="bg-red-500 text-white">Required</Badge>
                  )}
                  <Badge variant="outline">{field.component}</Badge>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEditField(field, containerIndex, fieldIndex)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteField(containerIndex, fieldIndex)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">ID: {field.id}</p>
                {field.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {field.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Container: {containers[containerIndex].label}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Field editor placeholder - in a real implementation, this would be a modal or expanded form */}
      {editingField && (
        <div className="mt-4">
          <Card className="p-4 bg-gray-50 dark:bg-gray-800">
            <p className="text-sm font-medium mb-2">Editing field: {editingField.field.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This is a placeholder for the field editor UI.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
} 