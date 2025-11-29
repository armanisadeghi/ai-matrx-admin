import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store';
import { selectPrimaryResponseTextByTaskId } from '../../socket-io/selectors/socket-response-selectors';
import { addMessage, setInstanceStatus } from '../slice';
import { selectInstance } from '../selectors';
import { createClient } from '@/utils/supabase/client';

interface FinalizeExecutionPayload {
    runId: string;
    taskId: string;
}

export const finalizeExecution = createAsyncThunk<
    void,
    FinalizeExecutionPayload,
    {
        dispatch: AppDispatch;
        state: RootState;
    }
>(
    'promptExecution/finalizeExecution',
    async ({ runId, taskId }, { dispatch, getState }) => {
        const state = getState();

        // 1. Get the final text from the socket response slice
        const finalText = selectPrimaryResponseTextByTaskId(taskId)(state);

        if (!finalText) {
            console.warn(`No final text found for task ${taskId}`);
            // Even if empty, we should probably finish the state to avoid sticking in 'executing'
        }

        // 2. Add the Assistant Message to Redux
        // This updates the instance.messages array, restoring conversation history
        dispatch(addMessage({
            runId,
            message: {
                role: 'assistant',
                content: finalText || '',
                taskId,
                timestamp: new Date().toISOString(),
                metadata: {
                    // We could fetch stats here if needed
                }
            }
        }));

        // 3. Update the Run in the Database
        const instance = selectInstance(state, runId);
        if (instance && instance.runTracking.savedToDatabase) {
            const supabase = createClient();

            // We need to fetch the current messages from DB or just append?
            // Usually we append. But Supabase JSONB arrays are tricky to append to atomically without a function.
            // For now, we'll read the latest state from Redux (which now has the new message) and update the whole array.
            // Or better, just append the new message.

            // Let's use the full message list from the instance (after the dispatch above processes)
            // Wait, dispatch is synchronous for reducers, so getState() again should have it?
            // Actually, we can just construct the message object and append it.

            const newMessage = {
                role: 'assistant',
                content: finalText || '',
                timestamp: new Date().toISOString()
            };

            // We can use a Postgres function if available, or just fetch-update.
            // Given the user's previous code, they likely did a full update or an RPC.
            // We'll try a simple update of the messages column by appending.

            // Fetch current run to get current messages? 
            // Or just trust Redux state? Redux state is the source of truth for the session.
            // Let's update with the full Redux message list.

            // Get fresh state
            const freshState = getState();
            const freshInstance = selectInstance(freshState, runId);

            if (freshInstance) {
                const { error } = await supabase
                    .from('ai_runs')
                    .update({
                        messages: freshInstance.messages, // Update with full history
                        status: 'active' // Keep active
                    })
                    .eq('id', runId);

                if (error) {
                    console.error('Failed to update run in DB:', error);
                }
            }
        }

        // 4. Set Status to Ready
        dispatch(setInstanceStatus({ runId, status: 'ready' }));

        console.log('✅ Execution finalized for run:', runId);
    }
);
