// components/TaskFields/TaskFieldBrokerValues.tsx
import React from 'react';
import { useTaskField } from '@/lib/redux/socket-io/hooks/useTaskField';
import { TaskFieldArrayWrapper } from '../TaskFieldArrayWrapper';
import { TaskField } from '../TaskField';

interface TaskFieldBrokerValuesProps {
  taskId: string;
  taskName: string;
  fieldPath: string;
  className?: string;
}

export const TaskFieldBrokerValues: React.FC<TaskFieldBrokerValuesProps> = ({
  taskId,
  taskName,
  fieldPath,
  className = '',
}) => {
  const { definition } = useTaskField(taskId, fieldPath);
  
  // Get the reference schema for broker values
  const brokerSchema = definition?.REFERENCE;
  
  if (!brokerSchema) {
    return <div className="error">No broker schema found</div>;
  }
  
  // Create empty broker template
  const emptyBroker = Object.keys(brokerSchema).reduce((acc, key) => {
    acc[key] = brokerSchema[key].DEFAULT;
    return acc;
  }, {} as Record<string, any>);
  
  // Render a broker item
  const renderBrokerItem = (
    broker: any, 
    index: number, 
    updateBroker: (newValue: any) => void, 
    removeBroker: () => void
  ) => {
    return (
      <div className="broker-item">
        <div className="broker-header">
          <h5>Broker {index + 1}</h5>
          <button type="button" onClick={removeBroker} className="remove-button">
            Remove
          </button>
        </div>
        
        <div className="broker-fields">
          {Object.keys(brokerSchema).map(field => (
            <TaskField
              key={field}
              taskId={taskId}
              taskName={taskName}
              fieldPath={`${fieldPath}.${index}.${field}`}
            />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <TaskFieldArrayWrapper
      taskId={taskId}
      fieldPath={fieldPath}
      renderItem={renderBrokerItem}
      emptyItem={emptyBroker}
      className={className}
      renderAddButton={() => (
        <button type="button" className="add-broker-button">
          Add Broker
        </button>
      )}
    />
  );
};