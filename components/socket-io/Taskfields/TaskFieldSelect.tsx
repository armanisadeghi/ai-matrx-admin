// components/TaskFields/TaskFieldSelect.tsx
import React from 'react';
import { useTaskField } from '@/lib/redux/socket-io/hooks/useTaskField';

interface TaskFieldSelectProps {
  taskId: string;
  fieldPath: string;
  className?: string;
}

export const TaskFieldSelect: React.FC<TaskFieldSelectProps> = ({
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

  // Get options from component props
  const options = componentProps.options || [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue(e.target.value);
  };

  return (
    <div className={`task-field-select ${className}`}>
      <select
        value={value || ''}
        onChange={handleChange}
        required={isRequired}
        aria-invalid={!validationState.isValid}
        className={className}
      >
        <option value="" disabled>
          {description || `Select ${fieldPath}`}
        </option>
        {options.map((option: { value: string; label: string }) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {!validationState.isValid && (
        <div className="error-message bg-inherit text-red-500">
          {validationState.errors.join(', ')}
        </div>
      )}
    </div>
  );
};