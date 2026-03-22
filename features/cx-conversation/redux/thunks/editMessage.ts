/**
 * editMessage thunk
 *
 * Calls the cx_message_edit Supabase RPC to update a message's content.
 * The RPC automatically appends the current content to content_history before
 * applying the new content — no client-side history management needed.
 *
 * Also supports restoring a previous history snapshot by passing the desired
 * snapshot content as `newContent`.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { createClient } from '@/utils/supabase/client';
import type { AppDispatch, RootState } from '@/lib/redux/store';
import { chatConversationsActions } from '../slice';
import { convertCxContentToDisplay } from '@/features/public-chat/utils/cx-content-converter';
import type { CxContentBlock, CxContentHistoryEntry, CxMessage } from '@/features/public-chat/types/cx-tables';

interface EditMessagePayload {
    sessionId: string;
    messageId: string;
    /** New content blocks to persist. To restore a history snapshot, pass snapshot.content here. */
    newContent: CxContentBlock[];
}

export const editMessage = createAsyncThunk<
    void,
    EditMessagePayload,
    { dispatch: AppDispatch; state: RootState }
>(
    'chatConversations/editMessage',
    async ({ sessionId, messageId, newContent }, { dispatch }) => {
        const supabase = createClient();

        const { data, error } = await supabase
            .rpc('cx_message_edit', {
                p_message_id: messageId,
                p_new_content: newContent,
            })
            .single<CxMessage>();

        if (error) {
            throw new Error(`cx_message_edit failed: ${error.message}`);
        }

        const updatedRow = data;
        const updatedRawContent = Array.isArray(updatedRow.content) ? updatedRow.content : [];
        const updatedContentHistory = (updatedRow.content_history as CxContentHistoryEntry[] | null) ?? null;

        // Convert the new content blocks to a display string
        const { content: displayContent, toolUpdates } = convertCxContentToDisplay(updatedRawContent);

        // Apply the new content + updated history to Redux
        dispatch(chatConversationsActions.applyMessageHistory({
            sessionId,
            messageId,
            entry: { content: newContent, saved_at: new Date().toISOString() },
            updatedRawContent,
            updatedContentHistory,
        }));

        // Also update the display content and toolUpdates
        dispatch(chatConversationsActions.updateMessage({
            sessionId,
            messageId,
            updates: {
                content: displayContent,
                toolUpdates: toolUpdates.length > 0 ? toolUpdates : undefined,
            },
        }));
    },
);
