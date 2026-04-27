// newMessageSlice.ts
import { createSlice, type AnyAction, PayloadAction } from "@reduxjs/toolkit";
import { newMessageAsyncTypePrefix } from "./newMessageAsyncTypeIds";

export type MessageRole = "user" | "assistant" | "system" | "tool";
export type MessageType =
  | "text"
  | "image"
  | "file"
  | "mixed"
  | "json_object"
  | "base64_image"
  | "blob"
  | "image_url"
  | "tool_result"
  | "other";
export type NewMessageStatus =
  | "pending"
  | "initializing"
  | "initialized"
  | "submitting"
  | "submitted"
  | "error";

export interface NewMessageState {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  displayOrder: number;
  systemOrder: number;
  metadata: Record<string, any>;
  userId: string;
  isPublic: boolean;
  status: NewMessageStatus;
}

const initialState: NewMessageState = {
  id: "",
  conversationId: "",
  role: "user",
  content: "",
  type: "text",
  displayOrder: 0,
  systemOrder: 0,
  metadata: {},
  userId: "",
  isPublic: false,
  status: "pending",
};

const newMessageSlice = createSlice({
  name: "newMessage",
  initialState,
  reducers: {
    setId(state, action: PayloadAction<string>) {
      state.id = action.payload;
    },
    setConversationId(state, action: PayloadAction<string>) {
      state.conversationId = action.payload;
    },
    setRole(state, action: PayloadAction<MessageRole>) {
      state.role = action.payload;
    },
    setContent(state, action: PayloadAction<string>) {
      state.content = action.payload;
    },
    setType(state, action: PayloadAction<MessageType>) {
      state.type = action.payload;
    },
    setDisplayOrder(state, action: PayloadAction<number>) {
      state.displayOrder = action.payload;
    },
    setSystemOrder(state, action: PayloadAction<number>) {
      state.systemOrder = action.payload;
    },
    setMetadata(state, action: PayloadAction<Record<string, any>>) {
      state.metadata = action.payload;
    },
    setUserId(state, action: PayloadAction<string>) {
      state.userId = action.payload;
    },
    setIsPublic(state, action: PayloadAction<boolean>) {
      state.isPublic = action.payload;
    },
    setStatus(state, action: PayloadAction<NewMessageStatus>) {
      state.status = action.payload;
    },
    resetNewMessage() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    const isType =
      (fullType: string) =>
      (action: AnyAction): action is AnyAction & { type: string } =>
        action.type === fullType;
    const start = newMessageAsyncTypePrefix.start;
    const submit = newMessageAsyncTypePrefix.submit;
    builder
      .addMatcher(isType(`${start}/pending`), (state) => {
        state.status = "initializing";
      })
      .addMatcher(isType(`${start}/fulfilled`), (state) => {
        state.status = "initialized";
      })
      .addMatcher(isType(`${start}/rejected`), (state) => {
        state.status = "error";
      })
      .addMatcher(isType(`${submit}/pending`), (state) => {
        state.status = "submitting";
      })
      .addMatcher(isType(`${submit}/fulfilled`), (state) => {
        state.status = "submitted";
      })
      .addMatcher(isType(`${submit}/rejected`), (state) => {
        state.status = "error";
      });
  },
});

export const {
  setId,
  setConversationId,
  setRole,
  setContent,
  setType,
  setDisplayOrder,
  setSystemOrder,
  setMetadata,
  setUserId,
  setIsPublic,
  setStatus,
  resetNewMessage,
} = newMessageSlice.actions;

export const newMessageReducer = newMessageSlice.reducer;

// Selectors
export const selectId = (state: { newMessage: NewMessageState }) =>
  state.newMessage.id;
export const selectConversationId = (state: { newMessage: NewMessageState }) =>
  state.newMessage.conversationId;
export const selectRole = (state: { newMessage: NewMessageState }) =>
  state.newMessage.role;
export const selectContent = (state: { newMessage: NewMessageState }) =>
  state.newMessage.content;
export const selectType = (state: { newMessage: NewMessageState }) =>
  state.newMessage.type;
export const selectDisplayOrder = (state: { newMessage: NewMessageState }) =>
  state.newMessage.displayOrder;
export const selectSystemOrder = (state: { newMessage: NewMessageState }) =>
  state.newMessage.systemOrder;
export const selectMetadata = (state: { newMessage: NewMessageState }) =>
  state.newMessage.metadata;
export const selectUserId = (state: { newMessage: NewMessageState }) =>
  state.newMessage.userId;
export const selectIsPublic = (state: { newMessage: NewMessageState }) =>
  state.newMessage.isPublic;
export const selectStatus = (state: { newMessage: NewMessageState }) =>
  state.newMessage.status;
