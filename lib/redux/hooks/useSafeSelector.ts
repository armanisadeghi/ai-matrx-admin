'use client';

import { useContext } from 'react';
import { ReactReduxContext } from 'react-redux';

/**
 * Check if Redux store is available in the current context.
 * This is useful for components that need to work both with and without Redux.
 *
 * @returns true if Redux store is available, false otherwise
 */
export function useHasReduxStore(): boolean {
    const context = useContext(ReactReduxContext);
    return context !== null && context.store !== undefined;
}

/**
 * Safe version of useAppSelector that returns undefined if Redux is not available.
 * Use this in components that need to work in both Redux and non-Redux contexts.
 *
 * @param selector - Redux selector function
 * @returns Selected state or undefined if Redux is not available
 */
export function useSafeSelector<TSelected>(
    selector: (state: any) => TSelected
): TSelected | undefined {
    const context = useContext(ReactReduxContext);

    if (!context || !context.store) {
        return undefined;
    }

    // We can now safely access the store
    return selector(context.store.getState());
}
