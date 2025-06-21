import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ResponsesState, SocketErrorObject } from '../socket.types';


const initialState: ResponsesState = {};

export const socketResponseSlice = createSlice({
  name: 'socketResponse',
  initialState,
  reducers: {
    addResponse: (
      state,
      action: PayloadAction<{ listenerId: string; taskId: string }>
    ) => {
      const { listenerId, taskId } = action.payload;
      state[listenerId] = {
        text: '',
        textChunks: [], // Initialize empty chunks array
        data: [],
        info: [],
        errors: [],
        ended: false,
        taskId,
      };
    },
    updateTextResponse: (
      state,
      action: PayloadAction<{ listenerId: string; text: string }>
    ) => {
      const { listenerId, text } = action.payload;
      if (state[listenerId]) {
        state[listenerId].text += text;
      }
    },
    // NEW: Performance-optimized text chunk appending (O(1) operation)
    appendTextChunk: (
      state,
      action: PayloadAction<{ listenerId: string; text: string }>
    ) => {
      const { listenerId, text } = action.payload;
      if (state[listenerId]) {
        state[listenerId].textChunks.push(text);
      }
    },
    updateDataResponse: (
      state,
      action: PayloadAction<{ listenerId: string; data: any }>
    ) => {
      const { listenerId, data } = action.payload;
      if (state[listenerId]) {
        state[listenerId].data.push(data);
      }
    },
    updateInfoResponse: (
      state,
      action: PayloadAction<{ listenerId: string; info: any }>
    ) => {
      const { listenerId, info } = action.payload;
      if (state[listenerId]) {
        state[listenerId].info.push(info);
      }
    },
    updateErrorResponse: (
      state,
      action: PayloadAction<{ listenerId: string; error: SocketErrorObject }>
    ) => {
      const { listenerId, error } = action.payload;
      if (state[listenerId]) {
        state[listenerId].errors.push(error);
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
  appendTextChunk, // Export new action
  updateDataResponse,
  updateInfoResponse,
  updateErrorResponse,
  markResponseEnd,
} = socketResponseSlice.actions;

export default socketResponseSlice.reducer;

