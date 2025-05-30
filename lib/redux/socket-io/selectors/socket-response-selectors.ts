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

// Memoized response selectors - Fix to avoid creating new objects unnecessarily
export const selectResponsesByTaskId = createSelector(
    [(state: RootState) => state.socketResponse, (_, taskId: string) => taskId],
    (responses, taskId) => {
        // First check if there are any responses for this task at all
        const hasTaskResponses = Object.values(responses).some(
            (response) => (response as ResponseState)?.taskId === taskId
        );
        
        if (!hasTaskResponses) {
            return {}; // Return empty object, will be memoized
        }
        
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

export const selectFirstResponseDataByListenerId = (listenerId: string) => (state: RootState) => {
    const data = state.socketResponse[listenerId]?.data || [];
    return data.length > 0 ? data[0] : null;
};

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
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) {
                return []; // Return empty array, will be memoized
            }
            
            return listenerIds.map((id) => ({
                listenerId: id,
                response: responses[id] as ResponseState,
            }));
        }
    );

export const selectTaskResults = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) {
                return { text: "", data: [], info: [], errors: [], ended: false };
            }
            
            if (listenerIds.length === 1) {
                const response = responses[listenerIds[0]];
                return response || { text: "", data: [], info: [], errors: [], ended: false };
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
        [
            (state: RootState) => selectTaskById(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (task, responses) => {
            if (!task) return false;
            const listenerIds = task.listenerIds;
            if (!listenerIds || listenerIds.length === 0) return false;
            return listenerIds.every((id) => responses[id]?.ended || false);
        }
    );

export const selectTaskError = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskById(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (task, responses) => {
            if (!task) return null;
            if (task.status === "error" && task.validationErrors?.length > 0) {
                return task.validationErrors[0];
            }
            const listenerIds = task.listenerIds || [];
            for (const id of listenerIds) {
                const errors = responses[id]?.errors || [];
                if (errors.length > 0) return errors[0];
            }
            return null;
        }
    );

export const selectPrimaryResponseForTask = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return null;
            return responses[listenerIds[0]] as ResponseState;
        }
    );

// Fix: Don't call a selector factory inside another selector
export const selectPrimaryResponseTextByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return "";
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.text || "";
        }
    );

export const selectPrimaryResponseDataByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return [];
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.data || [];
        }
    );

export const selectPrimaryResponseInfoByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return [];
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.info || [];
        }
    );

export const selectPrimaryResponseErrorsByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return [];
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.errors || [];
        }
    );

export const selectPrimaryResponseEndedByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return false;
            const response = responses[listenerIds[0]] as ResponseState;
            return response?.ended || false;
        }
    );

export const selectHasPrimaryResponseErrorsByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return false;
            const response = responses[listenerIds[0]] as ResponseState;
            return (response?.errors?.length || 0) > 0;
        }
    );

// First item convenience selectors for primary response arrays
export const selectFirstPrimaryResponseDataByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return null;
            const response = responses[listenerIds[0]] as ResponseState;
            const data = response?.data || [];
            return data.length > 0 ? data[0] : null;
        }
    );

export const selectFirstPrimaryResponseInfoByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return null;
            const response = responses[listenerIds[0]] as ResponseState;
            const info = response?.info || [];
            return info.length > 0 ? info[0] : null;
        }
    );

export const selectFirstPrimaryResponseErrorByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return null;
            const response = responses[listenerIds[0]] as ResponseState;
            const errors = response?.errors || [];
            return errors.length > 0 ? errors[0] : null;
        }
    );

export const createTaskResponseSelectors = (taskId: string) => {
    // Create the base selector once
    const baseSelector = createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return null;
            return responses[listenerIds[0]] as ResponseState;
        }
    );

    // Return all the derived selectors
    return {
        selectResponse: baseSelector,
        selectText: createSelector([baseSelector], (response) => response?.text || ""),
        selectData: createSelector([baseSelector], (response) => response?.data || []),
        selectInfo: createSelector([baseSelector], (response) => response?.info || []),
        selectErrors: createSelector([baseSelector], (response) => response?.errors || []),
        selectEnded: createSelector([baseSelector], (response) => response?.ended || false),
        selectHasErrors: createSelector([baseSelector], (response) => (response?.errors?.length || 0) > 0),
    };
};
