// hooks/usePreferenceValue.ts
import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch, UserPreferences, setPreference } from '@/lib/redux';

export function usePreferenceValue<
    T extends keyof UserPreferences,
    K extends keyof UserPreferences[T]
>(
    module: T,
    preference: K
): [UserPreferences[T][K], (value: UserPreferences[T][K]) => void] {
    const dispatch = useAppDispatch();
    // TODO: Quick hack to resolve undefined issues - Kelvin
    const initialValue = useAppSelector(state => {
        console.log("User Preferences:", state.userPreferences);
        return state.userPreferences[module]?.[preference!];
    });
    const [localValue, setLocalValue] = useState(initialValue);
    
    // Track initial value to know if we need to update on unmount
    const initialValueRef = useRef(initialValue);

    // Only run once on mount and cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('=========================== CLEANUP ===========================');
            if (localValue !== initialValueRef.current) {
                dispatch(setPreference({
                    module,
                    preference: preference as string,
                    value: localValue
                }));
            }
        };
    }, []); // Empty deps array = only on mount/unmount

    return [localValue, setLocalValue];
}
