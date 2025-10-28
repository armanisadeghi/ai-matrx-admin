"use client";

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux";
import { ResponsesState, ResponseState } from "@/lib/redux/socket-io/socket.types";
import { selectTaskListenerIds, selectTaskById } from "./socket-task-selectors";

// Shared constants to avoid creating new array references
export const EMPTY_ARRAY: any[] = [];
const EMPTY_RESPONSE_STATE = { text: "", data: EMPTY_ARRAY, info: EMPTY_ARRAY, errors: EMPTY_ARRAY, toolUpdates: EMPTY_ARRAY, ended: false };

// ==================== Base Response Selectors ====================
export const selectAllResponses = createSelector([(state: RootState) => state.socketResponse], (responses) => responses);

// Fixed: Use createSelector for proper memoization and build on selectAllResponses
export const selectResponseByListenerId = (listenerId: string | undefined) =>
    createSelector([selectAllResponses], (responses) => 
        listenerId ? responses[listenerId] as ResponseState | undefined : undefined
    );

// Memoized response selectors - Fix to avoid creating new objects unnecessarily
export const selectResponsesByTaskId = createSelector(
    [(state: RootState) => state.socketResponse, (_, taskId: string) => taskId],
    (responses, taskId) => {
        // First check if there are any responses for this task at all
        const hasTaskResponses = Object.values(responses).some((response) => (response as ResponseState)?.taskId === taskId);

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
export const selectResponseTextByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseByListenerId(listenerId)], (response) => {
        if (!response) return "";
        // Use textChunks if available (new performance approach), fallback to text
        if (response.textChunks && response.textChunks.length > 0) {
            return response.textChunks.join("");
        }
        return response.text || "";
    });

export const selectResponseDataByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseByListenerId(listenerId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!listenerId || !response) return [];
        return response.data || [];
    });

export const selectFirstResponseDataByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseDataByListenerId(listenerId)], (data) => (data.length > 0 ? data[0] : null));

export const selectResponseInfoByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseByListenerId(listenerId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!listenerId || !response) return [];
        return response.info || [];
    });

export const selectResponseErrorsByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseByListenerId(listenerId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!listenerId || !response) return [];
        return response.errors || [];
    });

export const selectResponseToolUpdatesByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseByListenerId(listenerId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!listenerId || !response) return [];
        return response.toolUpdates || [];
    });

export const selectResponseEndedByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseByListenerId(listenerId)], (response) => {
        // Handle undefined listenerId during page loading to avoid reselect warning
        if (!listenerId) return false;
        return response ? Boolean(response.ended) : false;
    });

export const selectHasResponseErrorsByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseErrorsByListenerId(listenerId)], (errors) => errors.length > 0);

export const selectHasResponseToolUpdatesByListenerId = (listenerId: string | undefined) =>
    createSelector([selectResponseToolUpdatesByListenerId(listenerId)], (toolUpdates) => toolUpdates.length > 0);

// ==================== Combined Task-Response Selectors ====================
export const selectTaskResponsesByTaskId = (taskId: string) =>
    createSelector(
        [(state: RootState) => selectTaskListenerIds(state, taskId), (state: RootState) => state.socketResponse],
        (listenerIds, responses) => {
            if (!taskId || !listenerIds || listenerIds.length === 0) {
                return EMPTY_ARRAY; // Return shared empty array
            }

            return listenerIds.map((id) => ({
                listenerId: id,
                response: responses[id] as ResponseState,
            }));
        }
    );

export const selectTaskResults = (taskId: string) =>
    createSelector(
        [(state: RootState) => selectTaskListenerIds(state, taskId), (state: RootState) => state.socketResponse],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) {
                return EMPTY_RESPONSE_STATE;
            }

            // Helper function to get text from either textChunks or text
            const getResponseText = (response: ResponseState) => {
                if (!response) return "";
                if (response.textChunks && response.textChunks.length > 0) {
                    return response.textChunks.join("");
                }
                return response.text || "";
            };

            if (listenerIds.length === 1) {
                const response = responses[listenerIds[0]];
                if (!response) {
                    return { text: "", data: [], info: [], errors: [], toolUpdates: [], ended: false };
                }
                return {
                    ...response,
                    text: getResponseText(response), // Always use the helper for consistent text extraction
                    data: response.data || [],
                    info: response.info || [],
                    errors: response.errors || [],
                    toolUpdates: response.toolUpdates || [],
                    ended: response.ended || false,
                };
            }

            return listenerIds.reduce(
                (combined, listenerId) => {
                    const response = responses[listenerId] as ResponseState;
                    if (!response) return combined;
                    return {
                        text: combined.text + getResponseText(response), // Use helper here too
                        data: [...combined.data, ...response.data],
                        info: [...combined.info, ...response.info],
                        errors: [...combined.errors, ...response.errors],
                        toolUpdates: [...combined.toolUpdates, ...response.toolUpdates],
                        ended: combined.ended && response.ended,
                    };
                },
                { text: "", data: [], info: [], errors: [], toolUpdates: [], ended: true }
            );
        }
    );

export const selectIsTaskComplete = (taskId: string) =>
    createSelector([(state: RootState) => selectTaskById(state, taskId), (state: RootState) => state.socketResponse], (task, responses) => {
        if (!task) return false;
        const listenerIds = task.listenerIds;
        if (!listenerIds || listenerIds.length === 0) return false;
        return listenerIds.every((id) => responses[id]?.ended || false);
    });

export const selectTaskError = (taskId: string) =>
    createSelector([(state: RootState) => selectTaskById(state, taskId), (state: RootState) => state.socketResponse], (task, responses) => {
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
    });

// ==================== Primary Response Selectors ====================
// Base selector for primary response - all other primary selectors build on this
export const selectPrimaryResponseForTask = (taskId: string) =>
    createSelector(
        [(state: RootState) => selectTaskListenerIds(state, taskId), (state: RootState) => state.socketResponse],
        (listenerIds, responses) => {
            if (!listenerIds || listenerIds.length === 0) return null;
            return responses[listenerIds[0]] as ResponseState;
        }
    );

// Fixed: Build all primary response selectors on top of the base selector
export const selectPrimaryResponseTextByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseForTask(taskId)], (response) => {
        if (!response) return "";
        // Use textChunks if available (new performance approach), fallback to text
        if (response.textChunks && response.textChunks.length > 0) {
            return response.textChunks.join("");
        }
        return response.text || "";
    });

export const selectPrimaryResponseDataByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseForTask(taskId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!taskId || !response) return [];
        return response.data || [];
    });

export const selectPrimaryResponseInfoByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseForTask(taskId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!taskId || !response) return [];
        return response.info || [];
    });

export const selectPrimaryResponseErrorsByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseForTask(taskId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!taskId || !response) return [];
        return response.errors || [];
    });

export const selectPrimaryResponseToolUpdatesByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseForTask(taskId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!taskId || !response) return [];
        return response.toolUpdates || [];
    });

export const selectPrimaryResponseEndedByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseForTask(taskId)], (response) => {
        // Ensure transformation to avoid reselect identity function warning
        if (!taskId) return false;
        return response ? Boolean(response.ended) : false;
    });

export const selectHasPrimaryResponseErrorsByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseErrorsByTaskId(taskId)], (errors) => errors.length > 0);

export const selectHasPrimaryResponseToolUpdatesByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseToolUpdatesByTaskId(taskId)], (toolUpdates) => toolUpdates.length > 0);

export const selectPrimaryCombinedTextByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseForTask(taskId)], (response) => {
        if (!response) return "";

        // Use textChunks if available (new performance approach), fallback to text
        if (response.textChunks && response.textChunks.length > 0) {
            return response.textChunks.join("");
        }
        return response.text || "";
    });

// ==================== First Item Convenience Selectors ====================
// Fixed: Build on top of existing data selectors
export const selectFirstPrimaryResponseDataByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseDataByTaskId(taskId)], (data) => (data.length > 0 ? data[0] : null));

export const selectFirstPrimaryResponseInfoByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseInfoByTaskId(taskId)], (info) => (info.length > 0 ? info[0] : null));

export const selectFirstPrimaryResponseErrorByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseErrorsByTaskId(taskId)], (errors) => (errors.length > 0 ? errors[0] : null));

export const selectFirstPrimaryResponseToolUpdateByTaskId = (taskId: string) =>
    createSelector([selectPrimaryResponseToolUpdatesByTaskId(taskId)], (toolUpdates) => (toolUpdates.length > 0 ? toolUpdates[0] : null));

// ==================== Selector Factory for Dynamic Usage ====================
export const createTaskResponseSelectors = (taskId: string) => {
    // Create the base selector once
    const baseSelector = selectPrimaryResponseForTask(taskId);
    // Return all the derived selectors built on the base
    return {
        selectResponse: baseSelector,
        selectText: createSelector([baseSelector], (response) => {
            if (!response) return "";
            // Use textChunks if available (new performance approach), fallback to text
            if (response.textChunks && response.textChunks.length > 0) {
                return response.textChunks.join("");
            }
            return response.text || "";
        }),
        selectTextChunks: createSelector([baseSelector], (response) => response?.textChunks || EMPTY_ARRAY),
        selectData: createSelector([baseSelector], (response) => response?.data || EMPTY_ARRAY),
        selectInfo: createSelector([baseSelector], (response) => response?.info || EMPTY_ARRAY),
        selectErrors: createSelector([baseSelector], (response) => response?.errors || EMPTY_ARRAY),
        selectToolUpdates: createSelector([baseSelector], (response) => response?.toolUpdates || EMPTY_ARRAY),
        selectEnded: createSelector([baseSelector], (response) => response?.ended || false),
        selectHasErrors: createSelector([baseSelector], (response) => (response?.errors?.length || 0) > 0),
        selectHasToolUpdates: createSelector([baseSelector], (response) => (response?.toolUpdates?.length || 0) > 0),
    };
};

// PERFORMANCE SELECTOR: Lazy concatenation of text chunks
export const selectCombinedText = (listenerId: string) =>
    createSelector([selectResponseByListenerId(listenerId)], (response) => {
        if (!response) return "";

        // Use textChunks if available (new performance approach), fallback to text
        if (response.textChunks && response.textChunks.length > 0) {
            return response.textChunks.join("");
        }
        return response.text || "";
    });
