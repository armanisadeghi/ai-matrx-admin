/**
 * messageActionsSlice — Instance-based overlay management for message actions.
 *
 * Design: Every AssistantActionBar registers an instance (keyed by a unique ID)
 * with the message context (content, sessionId, messageId, etc.). When a menu
 * action needs a sub-modal (Save to Notes, Email, Auth Gate, etc.), it dispatches
 * openOverlay with the instanceId. The MessageActionsController at the app root
 * reads openOverlays and renders the corresponding components — completely
 * decoupled from the menu's lifecycle.
 *
 * This eliminates the bug where closing the AdvancedMenu unmounts sub-modals
 * that were rendered as children of the menu component.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// ============================================================================
// TYPES
// ============================================================================

export type MessageActionOverlayType =
    | 'saveToNotes'
    | 'emailDialog'
    | 'authGate'
    | 'fullScreenEditor'
    | 'contentHistory'
    | 'htmlPreview'
    | 'submitFeedback'
    | 'announcements'
    | 'userPreferences';

export interface MessageActionInstance {
    content: string;
    messageId: string;
    sessionId: string;
    conversationId: string | null;
    rawContent: unknown[] | null;
    metadata: Record<string, unknown> | null;
}

export interface MessageActionOverlay {
    instanceId: string;
    overlay: MessageActionOverlayType;
    data?: Record<string, unknown>;
}

export interface MessageActionsState {
    instances: Record<string, MessageActionInstance>;
    openOverlays: MessageActionOverlay[];
}

// ============================================================================
// ACTION PAYLOADS
// ============================================================================

interface RegisterInstancePayload {
    id: string;
    context: MessageActionInstance;
}

interface UpdateInstanceContextPayload {
    id: string;
    updates: Partial<MessageActionInstance>;
}

interface OpenOverlayPayload {
    instanceId: string;
    overlay: MessageActionOverlayType;
    data?: Record<string, unknown>;
}

interface CloseOverlayPayload {
    instanceId: string;
    overlay: MessageActionOverlayType;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: MessageActionsState = {
    instances: {},
    openOverlays: [],
};

// ============================================================================
// SLICE
// ============================================================================

const messageActionsSlice = createSlice({
    name: 'messageActions',
    initialState,
    reducers: {
        registerInstance(state, action: PayloadAction<RegisterInstancePayload>) {
            const { id, context } = action.payload;
            state.instances[id] = context;
        },

        unregisterInstance(state, action: PayloadAction<string>) {
            const id = action.payload;
            delete state.instances[id];
            state.openOverlays = state.openOverlays.filter(o => o.instanceId !== id);
        },

        updateInstanceContext(state, action: PayloadAction<UpdateInstanceContextPayload>) {
            const { id, updates } = action.payload;
            const instance = state.instances[id];
            if (!instance) return;
            Object.assign(instance, updates);
        },

        openOverlay(state, action: PayloadAction<OpenOverlayPayload>) {
            const { instanceId, overlay, data } = action.payload;
            if (!state.instances[instanceId]) return;
            const existing = state.openOverlays.find(
                o => o.instanceId === instanceId && o.overlay === overlay,
            );
            if (existing) {
                if (data) existing.data = data;
                return;
            }
            state.openOverlays.push({ instanceId, overlay, data });
        },

        closeOverlay(state, action: PayloadAction<CloseOverlayPayload>) {
            const { instanceId, overlay } = action.payload;
            state.openOverlays = state.openOverlays.filter(
                o => !(o.instanceId === instanceId && o.overlay === overlay),
            );
        },

        closeAllOverlaysForInstance(state, action: PayloadAction<string>) {
            state.openOverlays = state.openOverlays.filter(
                o => o.instanceId !== action.payload,
            );
        },
    },
});

// ============================================================================
// EXPORTS
// ============================================================================

export const messageActionsActions = messageActionsSlice.actions;
export const messageActionsReducer = messageActionsSlice.reducer;
export default messageActionsSlice.reducer;

// ============================================================================
// SELECTORS
// ============================================================================

type StateWithMessageActions = { messageActions: MessageActionsState };

export const selectMessageActionInstance = (
    state: StateWithMessageActions,
    id: string,
): MessageActionInstance | undefined => state.messageActions.instances[id];

export const selectOpenOverlays = (
    state: StateWithMessageActions,
): MessageActionOverlay[] => state.messageActions.openOverlays;

export const selectOverlaysForInstance = (
    state: StateWithMessageActions,
    instanceId: string,
): MessageActionOverlay[] =>
    state.messageActions.openOverlays.filter(o => o.instanceId === instanceId);

export const selectIsMessageActionOverlayOpen = (
    state: StateWithMessageActions,
    instanceId: string,
    overlay: MessageActionOverlayType,
): boolean =>
    state.messageActions.openOverlays.some(
        o => o.instanceId === instanceId && o.overlay === overlay,
    );

export const selectMessageActionOverlayData = (
    state: StateWithMessageActions,
    instanceId: string,
    overlay: MessageActionOverlayType,
): Record<string, unknown> | undefined =>
    state.messageActions.openOverlays.find(
        o => o.instanceId === instanceId && o.overlay === overlay,
    )?.data;
