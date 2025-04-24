// components/TaskFields/TaskFieldSwitch.tsx
import React from 'react';
import { useTaskField } from '@/lib/redux/socket-io/hooks/useTaskField';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface TaskFieldSwitchProps {
  taskId: string;
  fieldPath: string;
  className?: string;
}

export const TaskFieldSwitch: React.FC<TaskFieldSwitchProps> = ({
  taskId,
  fieldPath,
  className = '',
}) => {
  const {
    value,
    setValue,
    definition,
    isRequired,
    description,
    componentProps,
    validationState
  } = useTaskField(taskId, fieldPath);

  // Convert value to boolean
  const boolValue = value === true || value === 'true';

  const handleCheckedChange = (checked: boolean) => {
    setValue(checked);
  };

  return (
    <div className={`task-field-switch flex items-center space-x-2 ${className}`}>
      <Switch
        checked={boolValue}
        onCheckedChange={handleCheckedChange}
        id={`${taskId}-${fieldPath}-switch`}
        {...componentProps}
        className={className}
      />
      {description && (
        <Label 
          htmlFor={`${taskId}-${fieldPath}-switch`}
          className="switch-label"
        >
          {description}
        </Label>
      )}
      
      {!validationState.isValid && (
        <div className="error-message text-red-500 ml-2">
          {validationState.errors.join(', ')}
        </div>
      )}
    </div>
  );
};