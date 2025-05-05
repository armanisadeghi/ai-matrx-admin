"use client";

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux";
import { SocketTask } from "@/lib/redux/socket-io/socket.types";

// ==================== Task Selectors ====================
export const selectAllTasks = (state: RootState): Record<string, SocketTask> => state.socketTasks.tasks as Record<string, SocketTask>;

export const selectTaskById = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => tasks[taskId]
);

export const selectTaskStatus = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId];
        return task?.status || "not_found";
    }
);

export const selectListenerIdsByTaskId = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => tasks[taskId]?.listenerIds || []
);

export const selectTaskListenerIds = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId];
        return task?.listenerIds || [];
    }
);

export const selectTaskFirstListenerId = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId];
        return task?.listenerIds[0] || "";
    }
);

export const selectFieldValue = (taskId: string, fieldPath: string) =>
    createSelector(
        [(state: RootState) => selectAllTasks(state)[taskId]?.taskData],
        (taskData) => {
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
        }
    );

export const selectTaskNameById = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId];
        return task?.taskName || "";
    }
);

export const selectTaskDataById = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId];
        return task?.taskData || {};
    }
);

export const selectTaskValidationState = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId];
        return {
            isValid: task?.isValid || false,
            validationErrors: task?.validationErrors || [],
        };
    }
);

export const selectTasksByConnectionId = createSelector(
    [selectAllTasks, (_, connectionId: string) => connectionId],
    (tasks, connectionId) =>
        Object.values(tasks).filter((task) => task.connectionId === connectionId)
);

export const selectTasksByStatus = createSelector(
    [selectAllTasks, (_, status: string) => status],
    (tasks, status) =>
        Object.values(tasks).filter((task) => task.status === status)
);

export const selectTaskByListenerId = createSelector(
    [selectAllTasks, (_, listenerId: string) => listenerId],
    (tasks, listenerId) =>
        Object.values(tasks).find((task) => task.listenerIds.includes(listenerId))
);

export const selectTaskStreamingById = createSelector(
    [selectAllTasks, (_, taskId: string) => taskId],
    (tasks, taskId) => {
        const task = tasks[taskId];
        return task?.isStreaming || false;
    }
);

export const selectTaskStreamingByListenerId = createSelector(
    [selectTaskByListenerId, (_, listenerId: string) => listenerId],
    (task) => {
        return task?.isStreaming || false;
    }
);

export const selectTestMode = (state: RootState) => state.socketConnections.testMode;