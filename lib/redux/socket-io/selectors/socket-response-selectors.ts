"use client";

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux";
import { ResponsesState, ResponseState } from "@/lib/redux/socket-io/socket.types";
import { selectTaskListenerIds, selectTaskById } from "./socket-task-selectors";

export const selectAllResponses = (state: RootState) => state.socketResponse;

export const selectResponseByListenerId =
    (listenerId: string) =>
    (state: RootState): ResponseState | undefined =>
        state.socketResponse[listenerId] as ResponseState | undefined;

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

export const selectResponseTextByListenerId = (listenerId: string) => (state: RootState) => state.socketResponse[listenerId]?.text || "";

export const selectResponseDataByListenerId = (listenerId: string) => (state: RootState) => state.socketResponse[listenerId]?.data || [];

export const selectResponseInfoByListenerId = (listenerId: string) => (state: RootState) => state.socketResponse[listenerId]?.info || [];

export const selectResponseErrorsByListenerId = (listenerId: string) => (state: RootState) =>
    state.socketResponse[listenerId]?.errors || [];

export const selectResponseEndedByListenerId = (listenerId: string) => (state: RootState) =>
    state.socketResponse[listenerId]?.ended || false;

export const selectHasResponseErrorsByListenerId = (listenerId: string) => (state: RootState) =>
    (state.socketResponse[listenerId]?.errors.length || 0) > 0;

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

export const selectPrimaryResponseForTask = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return null;
            return responses[listenerIds[0]] as ResponseState;
        }
    );

// Fix: Don't call a selector factory inside another selector
export const selectPrimaryResponseTextByTaskId = (taskId: string) =>
    createSelector(
        // Use the same input selectors as the parent
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        // Re-implement the core logic and then add the specific field selection
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return "";
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.text || "";
        }
    );

export const selectPrimaryResponseDataByTaskId = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return [];
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.data || [];
        }
    );

export const selectPrimaryResponseInfoByTaskId = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return [];
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.info || [];
        }
    );

export const selectPrimaryResponseErrorsByTaskId = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return [];
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.errors || [];
        }
    );

export const selectPrimaryResponseEndedByTaskId = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return false;
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.ended || false;
        }
    );

export const selectHasPrimaryResponseErrorsByTaskId = (taskId: string) =>
    createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return false;
            const response = responses[listenerIds[0]] as ResponseState;
            return (response?.errors?.length || 0) > 0;
        }
    );

export const createTaskResponseSelectors = (taskId: string) => {
    // Create the base selector once
    const baseSelector = createSelector(
        (state: RootState) => selectTaskListenerIds(state, taskId),
        (state: RootState) => state.socketResponse,
        (listenerIds, responses) => {
            if (listenerIds.length === 0) return null;
            return responses[listenerIds[0]] as ResponseState;
        }
    );

    // Return all the derived selectors
    return {
        selectResponse: baseSelector,
        selectText: createSelector(baseSelector, (response) => response?.text || ""),
        selectData: createSelector(baseSelector, (response) => response?.data || []),
        selectInfo: createSelector(baseSelector, (response) => response?.info || []),
        selectErrors: createSelector(baseSelector, (response) => response?.errors || []),
        selectEnded: createSelector(baseSelector, (response) => response?.ended || false),
        selectHasErrors: createSelector(baseSelector, (response) => (response?.errors?.length || 0) > 0),
    };
};
