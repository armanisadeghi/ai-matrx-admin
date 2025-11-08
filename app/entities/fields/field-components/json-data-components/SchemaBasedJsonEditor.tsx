import React, { useState, useEffect, forwardRef } from 'react';
import { Edit, Eye, Plus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Schema types
type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface SchemaField {
  type: FieldType;
  label: string;
  description?: string;
  default?: any;
  fields?: Record<string, SchemaField>;  // For nested objects
  itemType?: SchemaField;                // For arrays
}

interface SchemaBasedJsonEditorProps {
  schema: Record<string, SchemaField>;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

const SchemaBasedJsonEditor = forwardRef<HTMLInputElement, SchemaBasedJsonEditorProps>(({
  schema,
  value,
  onChange,
  disabled = false,
  onFocus,
  onBlur,
  className,
}, ref) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>(() => {
    try {
      return value || generateDefaultValues(schema);
    } catch (e) {
      return generateDefaultValues(schema);
    }
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  // Generate default values based on schema
  function generateDefaultValues(schema: Record<string, SchemaField>) {
    const defaults: any = {};
    Object.entries(schema).forEach(([key, field]) => {
      switch (field.type) {
        case 'string':
          defaults[key] = field.default || '';
          break;
        case 'number':
          defaults[key] = field.default || 0;
          break;
        case 'boolean':
          defaults[key] = field.default || false;
          break;
        case 'array':
          defaults[key] = field.default || [];
          break;
        case 'object':
          defaults[key] = field.default || (field.fields ? generateDefaultValues(field.fields) : {});
          break;
      }
    });
    return defaults;
  }

  const handleFieldChange = (path: string[], value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  const handleArrayItemAdd = (path: string[], schema: SchemaField) => {
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (const key of path) {
        current = current[key];
      }
      if (schema.itemType) {
        switch (schema.itemType.type) {
          case 'string':
            current.push('');
            break;
          case 'number':
            current.push(0);
            break;
          case 'object':
            current.push(generateDefaultValues(schema.itemType.fields || {}));
            break;
        }
      }
      return newData;
    });
  };

  const handleArrayItemRemove = (path: string[], index: number) => {
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (const key of path) {
        current = current[key];
      }
      current.splice(index, 1);
      return newData;
    });
  };

  const renderField = (
    fieldName: string,
    field: SchemaField,
    path: string[] = [],
    isNested: boolean = false
  ) => {
    const currentPath = [...path, fieldName];
    const currentValue = path.reduce((obj, key) => obj[key], formData)[fieldName];

    switch (field.type) {
      case 'string':
      case 'number':
        return (
          <div key={fieldName} className={`mb-2 ${isNested ? 'ml-4' : ''}`}>
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={currentValue}
              onChange={(e) => handleFieldChange(currentPath, 
                field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
              disabled={disabled}
              className={`${className} w-full`}
              placeholder={field.description}
            />
          </div>
        );

      case 'boolean':
        return (
          <div key={fieldName} className={`mb-2 ${isNested ? 'ml-4' : ''}`}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={currentValue}
                onChange={(e) => handleFieldChange(currentPath, e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">{field.label}</span>
            </label>
          </div>
        );

      case 'array':
        return (
          <div key={fieldName} className={`mb-2 ${isNested ? 'ml-4' : ''}`}>
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <div className="space-y-2">
              {currentValue.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  {field.itemType && renderArrayItem(field.itemType, item, [...currentPath, index.toString()])}
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleArrayItemRemove(currentPath, index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => handleArrayItemAdd(currentPath, field)}
                >
                  <Plus className="h-4 w-4" /> Add {field.label}
                </Button>
              )}
            </div>
          </div>
        );

      case 'object':
        return (
          <div key={fieldName} className={`mb-4 ${isNested ? 'ml-4' : ''}`}>
            <label className="block text-sm font-medium mb-2">{field.label}</label>
            <div className="border rounded p-3 bg-background">
              {field.fields && Object.entries(field.fields).map(([nestedName, nestedField]) =>
                renderField(nestedName, nestedField, currentPath, true)
              )}
            </div>
          </div>
        );
    }
  };

  const renderArrayItem = (itemSchema: SchemaField, value: any, path: string[]) => {
    switch (itemSchema.type) {
      case 'string':
      case 'number':
        return (
          <input
            type={itemSchema.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(path, 
              itemSchema.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
            disabled={disabled}
            className={`${className} flex-1`}
          />
        );
      case 'object':
        return (
          <div className="flex-1 border rounded p-2 bg-background">
            {itemSchema.fields && Object.entries(itemSchema.fields).map(([fieldName, field]) =>
              renderField(fieldName, field, path.slice(0, -1), true)
            )}
          </div>
        );
    }
  };

  const ActionButton = ({ onClick, icon, disabled: buttonDisabled = false }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={buttonDisabled}
    >
      {icon}
    </Button>
  );

  const renderViewMode = () => (
    <div className="relative mt-6">
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-8 mt-6">
          {Object.entries(schema).map(([key, field]) => (
            <div key={key} className="mb-2">
              <span className="text-sm font-medium">{field.label}: </span>
              <span className="text-sm">
                {renderViewValue(formData[key], field)}
              </span>
            </div>
          ))}
        </div>
        {!disabled && (
          <div className="absolute right-0 top-6">
            <ActionButton
              onClick={() => setIsEditMode(true)}
              icon={<Edit className="h-4 w-4" />}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderViewValue = (value: any, field: SchemaField): React.ReactNode => {
    switch (field.type) {
      case 'string':
      case 'number':
        return value;
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'array':
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((item: any, index: number) => (
              <span key={index} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-sm">
                {field.itemType ? renderViewValue(item, field.itemType) : item}
              </span>
            ))}
          </div>
        );
      case 'object':
        return (
          <div className="ml-4 mt-1">
            {field.fields && Object.entries(field.fields).map(([key, nestedField]) => (
              <div key={key} className="text-sm">
                <span className="font-medium">{nestedField.label}: </span>
                {renderViewValue(value[key], nestedField)}
              </div>
            ))}
          </div>
        );
      default:
        return String(value);
    }
  };

  return (
    <div className="w-full">
      {isEditMode ? (
        <div className="relative">
          <div className="flex justify-end mb-2">
            <ActionButton
              onClick={() => setIsEditMode(false)}
              icon={<Eye className="h-4 w-4" />}
            />
          </div>
          {Object.entries(schema).map(([fieldName, field]) =>
            renderField(fieldName, field)
          )}
        </div>
      ) : renderViewMode()}
    </div>
  );
});

SchemaBasedJsonEditor.displayName = "SchemaBasedJsonEditor";

export default SchemaBasedJsonEditor;



/* Example Scheam:
const schema = {
  name: {
    type: 'string',
    label: 'Name',
    description: 'Enter the name'
  },
  age: {
    type: 'number',
    label: 'Age',
    default: 18
  },
  isActive: {
    type: 'boolean',
    label: 'Active Status'
  },
  contact: {
    type: 'object',
    label: 'Contact Info',
    


    */