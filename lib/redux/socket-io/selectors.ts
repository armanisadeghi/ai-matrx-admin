'use client';

import { RootState } from '../store';
import { ResponsesState } from './slices/socketResponseSlice';
import { Task } from './slices/socketTasksSlice';

// Socket Connection Selectors
export const selectSocket = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.socket;
};

export const selectSocketUrl = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.url;
};

export const selectNamespace = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.namespace;
};

export const selectConnectionStatus = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.connectionStatus;
};

export const selectIsConnected = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.connectionStatus === 'connected';
};

export const selectIsAuthenticated = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.isAuthenticated;
};

// Task Selectors
export const selectAllTasks = (state: RootState) => state.socketTasks.tasks;
export const selectTaskById = (state: RootState, taskId: string) => state.socketTasks.tasks[taskId];
export const selectTasksByStatus = (state: RootState, status: string) =>
  Object.values(state.socketTasks.tasks).filter((task) => task.status === status);
export const selectTaskDataById = (state: RootState, taskId: string) =>
  state.socketTasks.tasks[taskId]?.taskData || {};
export const selectTaskValidationState = (state: RootState, taskId: string) => ({
  isValid: state.socketTasks.tasks[taskId]?.isValid || false,
  validationErrors: state.socketTasks.tasks[taskId]?.validationErrors || [],
});
export const selectTaskStatus = (state: RootState, taskId: string) =>
  state.socketTasks.tasks[taskId]?.status || 'not_found';
export const selectTaskListenerIds = (state: RootState, taskId: string) =>
  state.socketTasks.tasks[taskId]?.listenerIds || [];
export const selectTaskByListenerId = (state: RootState, listenerId: string) =>
  Object.values(state.socketTasks.tasks).find((task: Task) => task.listenerIds.includes(listenerId));

// Response Selectors
export const selectAllResponses = (state: RootState) => state.socketResponse;
export const selectResponseById = (listenerId: string) => (state: RootState) =>
  state.socketResponse[listenerId];
export const selectResponseText = (listenerId: string) => (state: RootState) =>
  state.socketResponse[listenerId]?.text || '';
export const selectResponseData = (listenerId: string) => (state: RootState) =>
  state.socketResponse[listenerId]?.data || [];
export const selectResponseInfo = (listenerId: string) => (state: RootState) =>
  state.socketResponse[listenerId]?.info || [];
export const selectResponseErrors = (listenerId: string) => (state: RootState) =>
  state.socketResponse[listenerId]?.errors || [];
export const selectResponseEnded = (listenerId: string) => (state: RootState) =>
  state.socketResponse[listenerId]?.ended || false;
export const selectHasResponseErrors = (listenerId: string) => (state: RootState) =>
  (state.socketResponse[listenerId]?.errors.length || 0) > 0;
export const selectResponsesByTaskId = (state: RootState, taskId: string) =>
  Object.entries(state.socketResponse)
    .filter(([_, response]) => response.taskId === taskId)
    .reduce((acc, [listenerId, response]) => {
      acc[listenerId] = response;
      return acc;
    }, {} as ResponsesState);

// Combined Task-Response Selectors
export const selectTaskResponsesByTaskId = (taskId: string) => (state: RootState) => {
  const listenerIds = selectTaskListenerIds(state, taskId);
  return listenerIds.map((id) => ({
    listenerId: id,
    response: selectResponseById(id)(state),
  }));
};

export const selectPrimaryResponseForTask = (taskId: string) => (state: RootState) => {
  const listenerIds = selectTaskListenerIds(state, taskId);
  if (listenerIds.length === 0) return null;
  return selectResponseById(listenerIds[0])(state);
};

export const selectTaskResults = (taskId: string) => (state: RootState) => {
  const listenerIds = selectTaskListenerIds(state, taskId);
  if (listenerIds.length === 0) return { text: '', data: [], info: [], errors: [], ended: false };

  if (listenerIds.length === 1) {
    return (
      selectResponseById(listenerIds[0])(state) || {
        text: '',
        data: [],
        info: [],
        errors: [],
        ended: false,
      }
    );
  }

  return listenerIds.reduce(
    (combined, listenerId) => {
      const response = selectResponseById(listenerId)(state);
      if (!response) return combined;

      return {
        text: combined.text + response.text,
        data: [...combined.data, ...response.data],
        info: [...combined.info, ...response.info],
        errors: [...combined.errors, ...response.errors],
        ended: combined.ended && response.ended,
      };
    },
    { text: '', data: [], info: [], errors: [], ended: true }
  );
};

export const selectIsTaskComplete = (taskId: string) => (state: RootState) => {
  const task = selectTaskById(state, taskId);
  if (!task) return false;

  const listenerIds = task.listenerIds;
  if (listenerIds.length === 0) return false;

  return listenerIds.every((id) => selectResponseEnded(id)(state));
};

export const selectTaskError = (taskId: string) => (state: RootState) => {
  const task = selectTaskById(state, taskId);
  if (!task) return null;

  if (task.status === 'error' && task.validationErrors.length > 0) {
    return task.validationErrors[0];
  }

  const listenerIds = task.listenerIds;
  for (const id of listenerIds) {
    const errors = selectResponseErrors(id)(state);
    if (errors.length > 0) return errors[0];
  }

  return null;
};

// Selectors
export const selectConnectionById = (state: RootState, connectionId: string) =>
  state.socketConnections.connections[connectionId] || null;
export const selectPrimaryConnectionId = (state: RootState) =>
  state.socketConnections.primaryConnectionId || '';
export const selectPrimaryConnection = (state: RootState) =>
  state.socketConnections.connections[state.socketConnections.primaryConnectionId] || null;
export const selectAuthToken = (state: RootState) => state.socketConnections.authToken;
export const selectIsAdmin = (state: RootState) => state.socketConnections.isAdmin;

