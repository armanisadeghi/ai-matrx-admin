import React, { useEffect } from 'react';
import { useAppDispatch } from '@/lib/redux';
import { initializeTask } from '@/lib/redux/socket-io/slices/socketTasksSlice';
import DynamicForm from './DynamicForm';
import { v4 as uuidv4 } from 'uuid';

export default function TestForm() {
  const dispatch = useAppDispatch();
  const taskId = React.useMemo(() => uuidv4(), []);

  useEffect(() => {
    // Initialize the task
    dispatch(
      initializeTask({
        taskId,
        service: 'test_service',
        taskName: 'broker_test',
        connectionId: 'test_connection',
      })
    );
  }, [dispatch, taskId]);

  const handleSubmit = (data: Record<string, any>) => {
    console.log('Form submitted with data:', data);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dynamic Form Test</h1>
      <DynamicForm
        taskId={taskId}
        onSubmit={handleSubmit}
        showDebug={true}
      />
    </div>
  );
} 