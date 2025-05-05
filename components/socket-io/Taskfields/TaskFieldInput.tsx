// components/TaskFields/TaskFieldInput.tsx
import React from 'react';
import { useTaskField } from '@/lib/redux/socket-io/hooks/useTaskField';
import { Input } from '@/components/ui';

interface TaskFieldInputProps {
  taskId: string;
  fieldPath: string;
  className?: string;
  placeholder?: string;
}

export const TaskFieldInput: React.FC<TaskFieldInputProps> = ({
  taskId,
  fieldPath,
  className = '',
  placeholder = '',
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

  // Use the component props from schema or override with props
  const inputProps = {
    ...componentProps,
    placeholder: placeholder || description || `Enter ${fieldPath}`,
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  return (
    <div className={`task-field-input ${className}`}>
      <Input
        type="text"
        value={value || ''}
        onChange={handleChange}
        required={isRequired}
        aria-invalid={!validationState.isValid}
        className={className}
        {...inputProps}
      />
      {!validationState.isValid && (
        <div className="error-message">
          {validationState.errors.join(', ')}
        </div>
      )}
    </div>
  );
};