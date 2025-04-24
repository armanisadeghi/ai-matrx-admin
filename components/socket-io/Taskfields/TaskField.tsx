// components/TaskFields/TaskField.tsx
import React, { useMemo } from 'react';
import { useTaskField } from '@/lib/redux/socket-io/hooks/useTaskField';
import { TaskFieldInput } from './TaskFieldInput';
import { TaskFieldTextArea } from './TaskFieldTextArea';
import { TaskFieldSelect } from './TaskFieldSelect';
import { TaskFieldSwitch } from './TaskFieldSwitch';
import { TaskFieldJsonEditor } from './TaskFieldJsonEditor';
import { TaskFieldArrayWrapper } from './TaskFieldArrayWrapper';
import { TaskFieldBrokerValues } from './custom/TaskFieldBrokerValues';

interface TaskFieldProps {
  taskId: string;
  taskName: string;
  fieldPath: string;
  className?: string;
  label?: string;
  showLabel?: boolean;
  showIcon?: boolean;
}

export const TaskField: React.FC<TaskFieldProps> = ({
  taskId,
  taskName,
  fieldPath,
  className = '',
  label,
  showLabel = true,
  showIcon = true,
}) => {
  const {
    definition,
    componentType,
    iconName,
    description,
    isRequired,
  } = useTaskField(taskId, fieldPath);

  const fieldLabel = label || description || fieldPath;
  
  // Determine which component to render based on the schema
  const renderField = () => {
    if (!definition) {
      return <div className="error">No schema definition found for {fieldPath}</div>;
    }

    switch (componentType?.toLowerCase()) {
      case 'input':
        return (
          <TaskFieldInput 
            taskId={taskId} 
            fieldPath={fieldPath} 
            className={className}
          />
        );
      
      case 'textarea':
        return (
          <TaskFieldTextArea 
            taskId={taskId} 
            fieldPath={fieldPath} 
            className={className}
          />
        );
      
      case 'select':
        return (
          <TaskFieldSelect 
            taskId={taskId} 
            fieldPath={fieldPath} 
            className={className}
          />
        );
      
      case 'switch':
        return (
          <TaskFieldSwitch 
            taskId={taskId} 
            fieldPath={fieldPath} 
            className={className}
          />
        );
      
      case 'jsoneditor':
        return (
          <TaskFieldJsonEditor 
            taskId={taskId} 
            fieldPath={fieldPath} 
            className={className}
          />
        );
      
      // Add other component types as needed
      
      default:
        return (
          <TaskFieldInput 
            taskId={taskId} 
            fieldPath={fieldPath} 
            className={className}
          />
        );
    }
  };

  // Render icon if available and requested
  const renderIcon = () => {
    if (!showIcon || !iconName) return null;
    
    // Import your icon component here
    // Example: return <Icon name={iconName} />;
    return <span className="field-icon">{iconName}</span>;
  };

  return (
    <div className={`task-field ${className}`}>
      {showLabel && (
        <label className="field-label">
          {renderIcon()}
          {fieldLabel}
          {isRequired && <span className="required-indicator">*</span>}
        </label>
      )}
      {renderField()}
    </div>
  );
};