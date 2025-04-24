import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  createTask,
  updateTask,
  updateNestedTask,
  addItemToTaskArray,
  setTaskArray,
  updateTaskArrayItem,
  submitTask,
  startTask,
} from '../thunks/socketThunks';
import {
  selectTaskById,
  selectTaskDataById,
  selectTaskValidationState,
  selectTaskStatus,
  selectTaskListenerIds,
  selectPrimaryResponseForTask,
  selectTaskResults,
  selectIsTaskComplete,
  selectTaskError,
} from '../selectors';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks';

// Hook for creating and managing tasks
export const useSocketTask = (taskId?: string, connectionId?: string) => {
  const dispatch = useAppDispatch();

  // Create a new task
  const create = useCallback(
    (service: string, taskName: string, initialData?: Record<string, any>) =>
      dispatch(createTask(service, taskName, initialData, connectionId)),
    [dispatch, connectionId]
  );

  // Update task field
  const updateField = useCallback(
    (id: string, field: string, value: any) => dispatch(updateTask(id, field, value)),
    [dispatch]
  );

  // Update nested task field
  const updateNestedField = useCallback(
    (id: string, parentField: string, path: string, value: any) =>
      dispatch(updateNestedTask(id, parentField, path, value)),
    [dispatch]
  );

  // Add item to array field
  const addToArray = useCallback(
    (id: string, field: string, item: any) => dispatch(addItemToTaskArray(id, field, item)),
    [dispatch]
  );

  // Set array field
  const setArray = useCallback(
    (id: string, field: string, items: any[]) => dispatch(setTaskArray(id, field, items)),
    [dispatch]
  );

  // Update array item
  const updateArrayItem = useCallback(
    (id: string, field: string, index: number, item: any) =>
      dispatch(updateTaskArrayItem(id, field, index, item)),
    [dispatch]
  );

  // Submit task
  const submit = useCallback(
    (id: string) => dispatch(submitTask(id, connectionId)),
    [dispatch, connectionId]
  );

  // Create and submit in one step
  const createAndSubmit = useCallback(
    (service: string, taskName: string, taskData: Record<string, any>) =>
      dispatch(startTask(service, taskName, taskData, connectionId)),
    [dispatch, connectionId]
  );

  // Task data selector (only if taskId is provided)
  const taskData = useSelector(
    taskId ? (state: RootState) => selectTaskDataById(state, taskId) : () => ({})
  );

  // Task selector
  const task = useSelector(
    taskId ? (state: RootState) => selectTaskById(state, taskId) : () => null
  );

  // Validation state
  const validationState = useSelector(
    taskId
      ? (state: RootState) => selectTaskValidationState(state, taskId)
      : () => ({ isValid: false, validationErrors: [] })
  );

  // Task status
  const status = useSelector(
    taskId ? (state: RootState) => selectTaskStatus(state, taskId) : () => 'not_found'
  );

  // Task listener IDs
  const listenerIds = useSelector(
    taskId ? (state: RootState) => selectTaskListenerIds(state, taskId) : () => []
  );

  // Primary stream (first listener)
  const primaryStream = useSelector(
    taskId ? selectPrimaryResponseForTask(taskId) : () => null
  );

  // Combined results from all listeners
  const results = useSelector(
    taskId
      ? selectTaskResults(taskId)
      : () => ({ text: '', data: [], info: [], errors: [], ended: false })
  );

  // Is task complete
  const isComplete = useSelector(taskId ? selectIsTaskComplete(taskId) : () => false);

  // Task error
  const error = useSelector(taskId ? selectTaskError(taskId) : () => null);

  return {
    // Actions
    create,
    updateField,
    updateNestedField,
    addToArray,
    setArray,
    updateArrayItem,
    submit,
    createAndSubmit,

    // State
    task,
    taskData,
    validationState,
    status,
    listenerIds,
    primaryStream,
    results,
    isComplete,
    error,
  };
};

// Hook for accessing task results when you only have a listener ID
export const useSocketResponse = (listenerId: string) => {
  const stream = useSelector((state: RootState) => state.socketResponse[listenerId] || null);
  const text = useSelector((state: RootState) => state.socketResponse[listenerId]?.text || '');
  const data = useSelector((state: RootState) => state.socketResponse[listenerId]?.data || []);
  const info = useSelector((state: RootState) => state.socketResponse[listenerId]?.info || []);
  const errors = useSelector((state: RootState) => state.socketResponse[listenerId]?.errors || []);
  const hasErrors = useSelector(
    (state: RootState) => (state.socketResponse[listenerId]?.errors.length || 0) > 0
  );
  const isEnded = useSelector((state: RootState) => state.socketResponse[listenerId]?.ended || false);
  const relatedTask = useSelector((state: RootState) => {
    return (
      Object.values(state.socketTasks.tasks).find((task) => task.listenerIds.includes(listenerId)) ||
      null
    );
  });

  return {
    stream,
    text,
    data,
    info,
    errors,
    hasErrors,
    isEnded,
    relatedTask,
  };
};