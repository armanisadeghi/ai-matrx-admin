// components/TaskFields/TaskFieldArrayWrapper.tsx
import React from 'react';
import { useTaskField } from '@/lib/redux/socket-io/hooks/useTaskField';

interface TaskFieldArrayWrapperProps {
  taskId: string;
  fieldPath: string;
  renderItem: (
    item: any, 
    index: number, 
    updateItem: (newValue: any) => void, 
    removeItem: () => void
  ) => React.ReactNode;
  renderAddButton?: () => React.ReactNode;
  className?: string;
  emptyItem?: any;
}

export const TaskFieldArrayWrapper: React.FC<TaskFieldArrayWrapperProps> = ({
  taskId,
  fieldPath,
  renderItem,
  renderAddButton,
  className = '',
  emptyItem = {},
}) => {
  const {
    value,
    arrayFunctions,
    definition,
    isRequired,
    description,
    validationState
  } = useTaskField(taskId, fieldPath);

  // Ensure value is an array
  const items = Array.isArray(value) ? value : [];

  // If not an array field, show error
  if (!arrayFunctions) {
    return <div className="error">Field {fieldPath} is not an array</div>;
  }

  const handleAddItem = () => {
    arrayFunctions.addItem(emptyItem);
  };

  const defaultAddButton = (
    <button 
      type="button" 
      onClick={handleAddItem}
      className="add-item-button"
    >
      Add Item
    </button>
  );

  return (
    <div className={`task-field-array ${className}`}>
      <div className="array-header">
        <h4>{description}</h4>
        {renderAddButton ? renderAddButton() : defaultAddButton}
      </div>
      
      {items.length === 0 && (
        <div className="empty-array">No items yet</div>
      )}
      
      <div className="array-items">
        {items.map((item, index) => (
          <div key={index} className="array-item">
            {renderItem(
              item,
              index,
              (newValue) => arrayFunctions.updateItem(index, newValue),
              () => arrayFunctions.removeItem(index)
            )}
          </div>
        ))}
      </div>
      
      {!validationState.isValid && (
        <div className="error-message">
          {validationState.errors.join(', ')}
        </div>
      )}
    </div>
  );
};