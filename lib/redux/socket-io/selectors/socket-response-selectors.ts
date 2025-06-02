"use client";

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux";
import { ResponsesState, ResponseState } from "@/lib/redux/socket-io/socket.types";
import { selectTaskListenerIds, selectTaskById } from "./socket-task-selectors";

// ==================== Base Response Selectors ====================
export const selectAllResponses = createSelector(
    [(state: RootState) => state.socketResponse],
    (responses) => responses
);

// Fixed: Use createSelector for proper memoization
export const selectResponseByListenerId = (listenerId: string) =>
    createSelector(
        [(state: RootState) => state.socketResponse],
        (responses) => responses[listenerId] as ResponseState | undefined
    );

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

// ==================== Individual Response Property Selectors ====================
// Fixed: Use createSelector consistently for all response property selectors
export const selectResponseTextByListenerId = (listenerId: string) =>
    createSelector(
        [selectResponseByListenerId(listenerId)],
        (response) => response?.text || ""
    );

export const selectResponseDataByListenerId = (listenerId: string) =>
    createSelector(
        [selectResponseByListenerId(listenerId)],
        (response) => response?.data || []
    );

export const selectFirstResponseDataByListenerId = (listenerId: string) =>
    createSelector(
        [selectResponseDataByListenerId(listenerId)],
        (data) => data.length > 0 ? data[0] : null
    );

export const selectResponseInfoByListenerId = (listenerId: string) =>
    createSelector(
        [selectResponseByListenerId(listenerId)],
        (response) => response?.info || []
    );

export const selectResponseErrorsByListenerId = (listenerId: string) =>
    createSelector(
        [selectResponseByListenerId(listenerId)],
        (response) => response?.errors || []
    );

export const selectResponseEndedByListenerId = (listenerId: string) =>
    createSelector(
        [selectResponseByListenerId(listenerId)],
        (response) => response?.ended || false
    );

export const selectHasResponseErrorsByListenerId = (listenerId: string) =>
    createSelector(
        [selectResponseErrorsByListenerId(listenerId)],
        (errors) => errors.length > 0
    );

// ==================== Combined Task-Response Selectors ====================
export const selectTaskResponsesByTaskId = (taskId: string) =>
    createSelector(
        [
            (state: RootState) => selectTaskListenerIds(state, taskId),
            (state: RootState) => state.socketResponse,
        ],
        (listenerIds, responses) => {
            if (!taskId || !listenerIds || listenerIds.length === 0) {
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

// ==================== Primary Response Selectors ====================
// Base selector for primary response - all other primary selectors build on this
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

// Fixed: Build all primary response selectors on top of the base selector
export const selectPrimaryResponseTextByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseForTask(taskId)],
        (response) => response?.text || ""
    );

export const selectPrimaryResponseDataByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseForTask(taskId)],
        (response) => response?.data || []
    );

export const selectPrimaryResponseInfoByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseForTask(taskId)],
        (response) => response?.info || []
    );

export const selectPrimaryResponseErrorsByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseForTask(taskId)],
        (response) => response?.errors || []
    );

export const selectPrimaryResponseEndedByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseForTask(taskId)],
        (response) => response?.ended || false
    );

export const selectHasPrimaryResponseErrorsByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseErrorsByTaskId(taskId)],
        (errors) => errors.length > 0
    );

// ==================== First Item Convenience Selectors ====================
// Fixed: Build on top of existing data selectors
export const selectFirstPrimaryResponseDataByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseDataByTaskId(taskId)],
        (data) => data.length > 0 ? data[0] : null
    );

export const selectFirstPrimaryResponseInfoByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseInfoByTaskId(taskId)],
        (info) => info.length > 0 ? info[0] : null
    );

export const selectFirstPrimaryResponseErrorByTaskId = (taskId: string) =>
    createSelector(
        [selectPrimaryResponseErrorsByTaskId(taskId)],
        (errors) => errors.length > 0 ? errors[0] : null
    );

// ==================== Selector Factory for Dynamic Usage ====================
export const createTaskResponseSelectors = (taskId: string) => {
    // Create the base selector once
    const baseSelector = selectPrimaryResponseForTask(taskId);

    // Return all the derived selectors built on the base
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
