/**
 * Legacy chat thunk shims.
 *
 * Replaces send/edit/load thunks from
 * `@/features/agents/redux/old/OLD-cx-message-actions/thunks/*`. Each is a
 * createAsyncThunk that resolves to undefined — chat is rebuilt; callers are
 * scheduled for replacement with `launchConversation` / `loadConversation`.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";

export const sendMessage = createAsyncThunk<void, unknown>(
  "legacy/sendMessage",
  async () => undefined,
);

export const editMessage = createAsyncThunk<void, unknown>(
  "legacy/editMessage",
  async () => undefined,
);

export const loadConversationHistory = createAsyncThunk<void, unknown>(
  "legacy/loadConversationHistory",
  async () => undefined,
);
