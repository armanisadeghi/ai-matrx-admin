import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SOCKET_TASKS, Schema } from "@/constants/socket-constants";
import { startSocketTask } from "../socket/socketActions"; // Import socket thunk

export interface DynamicEvent {
    eventId: string; // e.g., "chat_service_ai_chat_20250321123456_0"
    service: string;
    taskName: string;
    status: "building" | "pending" | "processing" | "completed" | "errored";
    taskData: Record<string, any>; // Partial task data being built
    socketEventName?: string; // Assigned by socketSlice after submission
    result?: string;
    error?: string;
    streamChunks?: string[];
}

interface DynamicEventsState {
    events: Record<string, DynamicEvent>;
}

const initialState: DynamicEventsState = {
    events: {},
};

const dynamicEventsSlice = createSlice({
    name: "dynamicEvents",
    initialState,
    reducers: {
        initializeTask(state, action: PayloadAction<{ service: string; taskName: string }>) {
            const { service, taskName } = action.payload;
            const eventId = `${service}_${taskName}_${Date.now()}_0`;
            state.events[eventId] = {
                eventId,
                service,
                taskName,
                status: "building",
                taskData: {},
            };
        },
        setTaskField(state, action: PayloadAction<{ eventId: string; field: string; value: any }>) {
            const event = state.events[action.payload.eventId];
            if (event) event.taskData[action.payload.field] = action.payload.value;
        },
        setTaskNestedField(state, action: PayloadAction<{ eventId: string; parentField: string; nestedField: string; value: any }>) {
            const { eventId, parentField, nestedField, value } = action.payload;
            const event = state.events[eventId];
            if (event) {
                event.taskData[parentField] = event.taskData[parentField] || {};
                event.taskData[parentField][nestedField] = value;
            }
        },
        updateEventStatus(state, action: PayloadAction<{ eventId: string; status: DynamicEvent["status"] }>) {
            const event = state.events[action.payload.eventId];
            if (event) event.status = action.payload.status;
        },
        setSocketEventName(state, action: PayloadAction<{ eventId: string; socketEventName: string }>) {
            const event = state.events[action.payload.eventId];
            if (event) event.socketEventName = action.payload.socketEventName;
        },
        appendStreamChunk(state, action: PayloadAction<{ eventId: string; chunk: string }>) {
            const event = state.events[action.payload.eventId];
            if (event) {
                event.streamChunks = event.streamChunks || [];
                event.streamChunks.push(action.payload.chunk);
                event.result = event.streamChunks.join("");
            }
        },
        updateEventResult(state, action: PayloadAction<{ eventId: string; result: string }>) {
            const event = state.events[action.payload.eventId];
            if (event) event.result = action.payload.result;
        },
        setEventError(state, action: PayloadAction<{ eventId: string; error: string }>) {
            const event = state.events[action.payload.eventId];
            if (event) {
                event.status = "errored";
                event.error = action.payload.error;
            }
        },
        removeEvent(state, action: PayloadAction<string>) {
            delete state.events[action.payload];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(startSocketTask.fulfilled, (state, action) => {
                const { eventName, isStreaming } = action.payload;
                const event = Object.values(state.events).find((e) => e.socketEventName === eventName);
                if (event) {
                    event.status = isStreaming ? "processing" : "completed";
                }
            })
            .addCase(startSocketTask.rejected, (state, action) => {
                const event = Object.values(state.events).find((e) => e.status === "pending");
                if (event) {
                    event.status = "errored";
                    event.error = action.error.message || "Task submission failed";
                }
            });
    },
});

export const {
    initializeTask,
    setTaskField,
    setTaskNestedField,
    updateEventStatus,
    setSocketEventName,
    appendStreamChunk,
    updateEventResult,
    setEventError,
    removeEvent,
} = dynamicEventsSlice.actions;

export default dynamicEventsSlice.reducer;

export const isTaskReady = (event: DynamicEvent): boolean => {
    const schema: Schema = SOCKET_TASKS[event.taskName];
    if (!schema) return false;

    for (const [fieldName, field] of Object.entries(schema)) {
        if (field.REQUIRED && !(fieldName in event.taskData)) return false;
        if (field.REFERENCE && field.REQUIRED) {
            const nestedSchema: Schema = field.REFERENCE;
            const nestedData = event.taskData[fieldName] || {};
            for (const [nestedField, nestedFieldDef] of Object.entries(nestedSchema)) {
                if (nestedFieldDef.REQUIRED && !(nestedField in nestedData)) return false;
            }
        }
    }
    return true;
};
