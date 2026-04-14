import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  ResponsesState,
  SocketErrorObject,
  ToolCallObject,
} from "../socket.types";
import type { TypedStreamEvent } from "@/types/python-generated/stream-events";

const initialState: ResponsesState = {};

export const socketResponseSlice = createSlice({
  name: "socketResponse",
  initialState,
  reducers: {
    addResponse: (
      state,
      action: PayloadAction<{ listenerId: string; taskId: string }>,
    ) => {
      const { listenerId, taskId } = action.payload;
      state[listenerId] = {
        text: "",
        textChunks: [],
        data: [],
        info: [],
        errors: [],
        toolUpdates: [],
        rawToolEvents: [],
        ended: false,
        taskId,
      };
    },
    updateTextResponse: (
      state,
      action: PayloadAction<{ listenerId: string; text: string }>,
    ) => {
      const { listenerId, text } = action.payload;
      if (state[listenerId]) {
        state[listenerId].text += text;
      }
    },
    // NEW: Performance-optimized text chunk appending (O(1) operation)
    appendTextChunk: (
      state,
      action: PayloadAction<{ listenerId: string; text: string }>,
    ) => {
      const { listenerId, text } = action.payload;
      if (state[listenerId]) {
        state[listenerId].textChunks.push(text);
      }
    },
    updateDataResponse: (
      state,
      action: PayloadAction<{ listenerId: string; data: any }>,
    ) => {
      const { listenerId, data } = action.payload;
      if (state[listenerId]) {
        state[listenerId].data.push(data);
      }
    },
    updateInfoResponse: (
      state,
      action: PayloadAction<{ listenerId: string; info: any }>,
    ) => {
      const { listenerId, info } = action.payload;
      if (state[listenerId]) {
        state[listenerId].info.push(info);
      }
    },
    updateErrorResponse: (
      state,
      action: PayloadAction<{ listenerId: string; error: SocketErrorObject }>,
    ) => {
      const { listenerId, error } = action.payload;
      if (state[listenerId]) {
        state[listenerId].errors.push(error);
      }
    },
    updateToolUpdateResponse: (
      state,
      action: PayloadAction<{ listenerId: string; toolUpdate: ToolCallObject }>,
    ) => {
      const { listenerId, toolUpdate } = action.payload;
      if (state[listenerId]) {
        state[listenerId].toolUpdates.push(toolUpdate);
      }
    },
    appendRawToolEvent: (
      state,
      action: PayloadAction<{ listenerId: string; event: TypedStreamEvent }>,
    ) => {
      const { listenerId, event } = action.payload;
      if (state[listenerId]) {
        state[listenerId].rawToolEvents.push(event);
      }
    },
    markResponseEnd: (state, action: PayloadAction<string>) => {
      const listenerId = action.payload;
      if (state[listenerId]) {
        state[listenerId].ended = true;
      }
    },
  },
});

export const {
  addResponse,
  updateTextResponse,
  appendTextChunk,
  updateDataResponse,
  updateInfoResponse,
  updateErrorResponse,
  updateToolUpdateResponse,
  appendRawToolEvent,
  markResponseEnd,
} = socketResponseSlice.actions;

export default socketResponseSlice.reducer;
