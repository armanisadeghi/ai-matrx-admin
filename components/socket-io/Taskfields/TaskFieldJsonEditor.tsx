// components/TaskFields/TaskFieldJsonEditor.tsx
import React, { useState } from 'react';
import { useTaskField } from '@/lib/redux/socket-io/hooks/useTaskField';
import { Textarea } from '@/components/ui';

interface TaskFieldJsonEditorProps {
  taskId: string;
  taskName: string;
  fieldPath: string;
  className?: string;
}

export const TaskFieldJsonEditor: React.FC<TaskFieldJsonEditorProps> = ({
  taskId,
  taskName,
  fieldPath,
  className = '',
}) => {
  const {
    value,
    setValue,
    definition,
    isRequired,
    description,
    validationState
  } = useTaskField(taskId, taskName, fieldPath);

  // Convert to string for editing
  const [jsonString, setJsonString] = useState(() => {
    try {
      return JSON.stringify(value || {}, null, 2);
    } catch (error) {
      return '{}';
    }
  });

  const [parseError, setParseError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonString(e.target.value);
    
    try {
      const parsed = JSON.parse(e.target.value);
      setValue(parsed);
      setParseError(null);
    } catch (error) {
      setParseError('Invalid JSON: ' + (error as Error).message);
    }
  };

  return (
    <div className={`task-field-json-editor ${className}`}>
      <Textarea
        value={jsonString}
        onChange={handleChange}
        rows={10}
        className={`${className} ${parseError ? 'error' : ''}`}
      />
      
      {parseError && (
        <div className="error-message">{parseError}</div>
      )}
      
      {!validationState.isValid && (
        <div className="error-message">
          {validationState.errors.join(', ')}
        </div>
      )}
    </div>
  );
};