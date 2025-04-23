// components/TaskFields/TaskForm.tsx
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/redux/store';
import { TaskField } from './TaskField';
import { getTaskSchema } from '@/constants/socket-schema';
import { useSocketTask } from '@/lib/redux/socket-io/hooks';

interface TaskFormProps {
  taskId: string;
  className?: string;
  excludeFields?: string[];
  onSubmit?: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  taskId,
  className = '',
  excludeFields = [],
  onSubmit,
}) => {
  const task = useSelector((state: RootState) => 
    state.socketTasks.tasks[taskId]
  );
  
  const { submit, validationState, isComplete, error } = useSocketTask(taskId);
  
  // If task not found, show error
  if (!task) {
    return <div className="error">Task not found</div>;
  }
  
  // Get schema for this task
  const schema = useMemo(() => 
    getTaskSchema(task.taskName),
    [task.taskName]
  );
  
  if (!schema) {
    return <div className="error">Schema not found for {task.taskName}</div>;
  }
  
  // Get all fields from schema, excluding any specified
  const fields = Object.keys(schema).filter(
    field => !excludeFields.includes(field)
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationState.isValid) {
      submit(taskId);
      if (onSubmit) onSubmit();
    }
  };
  
  return (
    <form className={`task-form ${className}`} onSubmit={handleSubmit}>
      {fields.map(field => (
        <TaskField
          key={field}
          taskId={taskId}
          taskName={task.taskName}
          fieldPath={field}
          className="bg-inherit text-inherit"
        />
      ))}
      
      {!validationState.isValid && (
        <div className="validation-errors">
          <h4>Please fix the following errors:</h4>
          <ul>
            {validationState.validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {error && (
        <div className="task-error">
          <h4>Error:</h4>
          <p>{error}</p>
        </div>
      )}
      
      <div className="form-actions">
        <button
          type="submit"
          disabled={!validationState.isValid || isComplete}
          className="submit-button"
        >
          {isComplete ? 'Submitted' : 'Submit'}
        </button>
      </div>
    </form>
  );
};