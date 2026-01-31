// middleware/syncMiddleware.ts
import { Middleware } from 'redux';

export const syncMiddleware: Middleware = store => next => async (action: any) => {
    if (action.type !== 'SYNC_STATE') {
        return next(action);
    }

    const { key, value, optimistic } = action.payload;

    // If optimistic, update state immediately
    if (optimistic) {
        next({
            type: 'UPDATE_STATE',
            payload: { key, value }
        });
    }

    try {
        // Perform actual sync
        const result = await fetch(`/api/sync/${key}`, {
            method: 'POST',
            body: JSON.stringify(value)
        });

        if (!result.ok) {
            throw new Error('Sync failed');
        }

        // If not optimistic, update state after successful sync
        if (!optimistic) {
            next({
                type: 'UPDATE_STATE',
                payload: { key, value }
            });
        }

        return result.json();
    } catch (error) {
        // If optimistic, revert state
        if (optimistic) {
            next({
                type: 'REVERT_STATE',
                payload: { key }
            });
        }
        throw error;
    }
};
