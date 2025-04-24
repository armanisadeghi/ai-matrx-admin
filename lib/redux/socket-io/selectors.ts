"use client";

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { ResponsesState, ResponseState } from "./socket.types";
import { SocketTask } from "./socket.types";

// ==================== Connection Selectors ====================
// Simple property access selectors
export const selectConnectionById = (state: RootState, connectionId: string) => state.socketConnections.connections[connectionId] || null;

export const selectPrimaryConnectionId = (state: RootState) => state.socketConnections.primaryConnectionId || "";

export const selectAuthToken = (state: RootState) => state.socketConnections.authToken;

export const selectIsAdmin = (state: RootState) => state.socketConnections.isAdmin;

export const selectPredefinedConnections = (state: RootState) => state.socketConnections.predefinedConnections;

export const selectConnectionForm = (state: RootState) => state.socketConnections.connectionForm;

// Connection selectors with parameter and derived state
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
    return state.socketConnections.connections[effectiveConnectionId]?.connectionStatus === "connected";
};

export const selectIsAuthenticated = (state: RootState, connectionId?: string) => {
    const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
    return state.socketConnections.connections[effectiveConnectionId]?.isAuthenticated;
};

// Memoized connection selectors
export const selectPrimaryConnection = createSelector(
    (state: RootState) => state.socketConnections.connections,
    (state: RootState) => state.socketConnections.primaryConnectionId,
    (connections, primaryId) => connections[primaryId] || null
);

export const selectAllConnections = createSelector(
    (state: RootState) => state.socketConnections.connections,
    (connections) => Object.values(connections)
);

// ==================== Task Selectors ====================
export const selectAllTasks = (state: RootState): Record<string, SocketTask> => state.socketTasks.tasks as Record<string, SocketTask>;

export const selectTaskById = (state: RootState, taskId: string): SocketTask | undefined =>
    (state.socketTasks.tasks as Record<string, SocketTask>)[taskId];

export const selectTaskStatus = (state: RootState, taskId: string): string => {
    const task = (state.socketTasks.tasks as Record<string, SocketTask>)[taskId];
    return task?.status || "not_found";
};

export const selectListenerIdsByTaskId = (state: RootState, taskId: string) => state.socketTasks.tasks[taskId]?.listenerIds || [];

export const selectTaskListenerIds = (state: RootState, taskId: string): string[] => {
    const task = (state.socketTasks.tasks as Record<string, SocketTask>)[taskId];
    return task?.listenerIds || [];
};

export const selectFieldValue = (taskId: string, fieldPath: string) =>
    createSelector([(state: RootState) => state.socketTasks.tasks[taskId]?.taskData], (taskData) => {
        if (!taskData) return undefined;

        // Split path, preserving array indices (e.g., broker_values[0].name -> ["broker_values", "[0]", "name"])
        const pathParts = fieldPath.split(/\.|(\[\d+\])/).filter(Boolean);
        let current = taskData;

        for (const part of pathParts) {
            if (!current || typeof current !== "object") {
                return undefined;
            }
            // Handle array index (e.g., [0])
            if (part.match(/^\[\d+\]$/)) {
                const index = parseInt(part.slice(1, -1), 10);
                if (!Array.isArray(current) || index >= current.length) {
                    return undefined;
                }
                current = current[index];
            } else {
                current = current[part];
            }
        }
        return current;
    });

export const selectTaskNameById = createSelector(
    [(state: RootState) => state.socketTasks.tasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId] as SocketTask;
        return task?.taskName || "";
    }
);

// Memoized task selectors
export const selectTaskDataById = createSelector(
    [(state: RootState) => state.socketTasks.tasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId] as SocketTask;
        return task?.taskData || {};
    }
);

export const selectTaskValidationState = createSelector(
    [(state: RootState) => state.socketTasks.tasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId] as SocketTask;
        return {
            isValid: task?.isValid || false,
            validationErrors: task?.validationErrors || [],
        };
    }
);

export const selectTasksByConnectionId = createSelector(
    [(state: RootState) => state.socketTasks.tasks, (_, connectionId: string) => connectionId],
    (tasks, connectionId) => Object.values(tasks).filter((task: SocketTask) => task.connectionId === connectionId)
);

export const selectTasksByStatus = createSelector(
    [(state: RootState) => state.socketTasks.tasks, (_, status: string) => status],
    (tasks, status) => Object.values(tasks).filter((task) => task.status === status)
);

export const selectTaskByListenerId = createSelector(
    [(state: RootState) => state.socketTasks.tasks, (_, listenerId: string) => listenerId],
    (tasks, listenerId) => Object.values(tasks).find((task) => task.listenerIds.includes(listenerId))
);

export const selectTestMode = (state: RootState) => state.socketConnections.testMode;

// ==================== Response Selectors ====================
// Simple response property access selectors
export const selectAllResponses = (state: RootState) => state.socketResponse;

export const selectResponseById =
    (listenerId: string) =>
    (state: RootState): ResponseState | undefined =>
        state.socketResponse[listenerId] as ResponseState | undefined;

export const selectResponseText = (listenerId: string) => (state: RootState) => state.socketResponse[listenerId]?.text || "";

export const selectResponseData = (listenerId: string) => (state: RootState) => state.socketResponse[listenerId]?.data || [];

export const selectResponseInfo = (listenerId: string) => (state: RootState) => state.socketResponse[listenerId]?.info || [];

export const selectResponseErrors = (listenerId: string) => (state: RootState) => state.socketResponse[listenerId]?.errors || [];

export const selectResponseEnded = (listenerId: string) => (state: RootState) => state.socketResponse[listenerId]?.ended || false;

export const selectHasResponseErrors = (listenerId: string) => (state: RootState) =>
    (state.socketResponse[listenerId]?.errors.length || 0) > 0;

// Memoized response selectors
export const selectResponsesByTaskId = createSelector(
    [(state: RootState) => state.socketResponse, (_, taskId: string) => taskId],
    (responses, taskId) => {
        const taskResponses: ResponsesState = {};
        Object.entries(responses).forEach(([listenerId, response]) => {
            if ((response as ResponseState).taskId === taskId) {
                taskResponses[listenerId] = response as ResponseState;
            }
        });
        return taskResponses;
    }
);

// ==================== Combined Task-Response Selectors ====================
export const selectTaskResponsesByTaskId = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) =>
            listenerIds.map((id) => ({
                listenerId: id,
                response: responses[id] as ResponseState,
            }))
    );

export const selectPrimaryResponseForTask = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return null;
            return responses[listenerIds[0]] as ResponseState;
        }
    );

export const selectTaskResults = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return { text: "", data: [], info: [], errors: [], ended: false };
            if (listenerIds.length === 1) {
                return responses[listenerIds[0]] || { text: "", data: [], info: [], errors: [], ended: false };
            }
            return listenerIds.reduce(
                (combined, listenerId) => {
                    const response = responses[listenerId] as ResponseState;
                    if (!response) return combined;
                    return {
                        text: combined.text + response.text,
                        data: [...combined.data, ...response.data],
                        info: [...combined.info, ...response.info],
                        errors: [...combined.errors, ...response.errors],
                        ended: combined.ended && response.ended,
                    };
                },
                { text: "", data: [], info: [], errors: [], ended: true }
            );
        }
    );

export const selectIsTaskComplete = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskById(state, taskId),
        (state: RootState) => state.socketResponse,
        (task, responses) => {
            if (!task) return false;
            const listenerIds = task.listenerIds;
            if (listenerIds.length === 0) return false;
            return listenerIds.every((id) => responses[id]?.ended || false);
        }
    );

export const selectTaskError = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskById(state, taskId),
        (state: RootState) => state.socketResponse,
        (task, responses) => {
            if (!task) return null;
            if (task.status === "error" && task.validationErrors.length > 0) {
                return task.validationErrors[0];
            }
            for (const id of task.listenerIds) {
                const errors = responses[id]?.errors || [];
                if (errors.length > 0) return errors[0];
            }
            return null;
        }
    );
