// components/TaskFields/TaskFieldTextArea.tsx
import React from 'react';
import { useTaskField } from '@/lib/redux/socket-io/hooks/useTaskField';

interface TaskFieldTextAreaProps {
  taskId: string;
  taskName: string;
  fieldPath: string;
  className?: string;
  placeholder?: string;
}

export const TaskFieldTextArea: React.FC<TaskFieldTextAreaProps> = ({
  taskId,
  taskName,
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
  } = useTaskField(taskId, taskName, fieldPath);

  // Use the component props from schema or override with props
  const textareaProps = {
    rows: 3,
    ...componentProps,
    placeholder: placeholder || description || `Enter ${fieldPath}`,
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  return (
    <div className={`task-field-textarea ${className}`}>
      <textarea
        value={value || ''}
        onChange={handleChange}
        required={isRequired}
        aria-invalid={!validationState.isValid}
        {...textareaProps}
        className={className}
      />
      {!validationState.isValid && (
        <div className="error-message bg-inherit text-red-500">
          {validationState.errors.join(', ')}
        </div>
      )}
    </div>
  );
};