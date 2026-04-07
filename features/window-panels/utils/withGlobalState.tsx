import React, { useEffect, useCallback, useMemo } from 'react';
import { useCallbackManager } from '@/hooks/useCallbackManager';
import { createUseModuleHook } from '@/lib/hooks/useModule';
import { moduleSchemas, SystemComponentsSchema } from '@/lib/redux/dynamic/moduleSchema';
import { createModuleSelectors } from '@/lib/redux/selectors/moduleSelectors';
import { useAppSelector } from '@/lib/redux/hooks';

// Ensure the module schema exists before attempting to use it
if (!moduleSchemas.systemComponents) {
    throw new Error("systemComponents schema is missing from moduleSchema.ts");
}

export const useSystemComponentsModule = createUseModuleHook<SystemComponentsSchema>(
    'systemComponents', 
    moduleSchemas.systemComponents as SystemComponentsSchema
);

// We need a stable instance of the module selectors
export const systemComponentSelectors = createModuleSelectors<SystemComponentsSchema>('systemComponents');

export interface GlobalStateProps<TData = any, TConfigs = any, TPrefs = any> {
    instanceId: string;
    
    // Data State
    globalState?: TData;
    setGlobalState?: (state: Partial<TData>) => void;
    
    // Configurations State
    globalConfigs?: TConfigs;
    setGlobalConfigs?: (configs: Partial<TConfigs>) => void;
    
    // User Preferences State
    globalUserPrefs?: TPrefs;
    setGlobalUserPrefs?: (prefs: Partial<TPrefs>) => void;
    
    // Async callback management across the system
    createCallback?: ReturnType<typeof useCallbackManager>;
}

/**
 * A Higher Order Component that transparently backs arbitrary local component 
 * state using the global Redux module `systemComponents`.
 * 
 * Perfect for dynamic, multi-instanced window panels that require preserved 
 * layout data across renders but shouldn't pollute the root state.
 */
export function withGlobalState<P extends object, TData = any, TConfigs = any, TPrefs = any>(
    WrappedComponent: React.ComponentType<P & GlobalStateProps<TData, TConfigs, TPrefs>>,
    initialValues?: { data?: TData; configs?: TConfigs; userPrefs?: TPrefs }
) {
    return function GlobalStateWrapper(props: P & { instanceId: string }) {
        const { instanceId, ...restProps } = props;
        const module = useSystemComponentsModule();
        const createCallback = useCallbackManager();

        // Stable memoized selectors for this specific instance to prevent unnecessary re-renders
        const Selectors = useMemo(() => {
            return {
                data: systemComponentSelectors.getOneData(instanceId as keyof SystemComponentsSchema['data']),
                configs: systemComponentSelectors.getOneConfig(instanceId as keyof SystemComponentsSchema['configs']),
                prefs: systemComponentSelectors.getOneUserPreference(instanceId as keyof SystemComponentsSchema['userPreferences'])
            }
        }, [instanceId]);

        const stateData = useAppSelector(Selectors.data) as TData | undefined;
        const configData = useAppSelector(Selectors.configs) as TConfigs | undefined;
        const prefData = useAppSelector(Selectors.prefs) as TPrefs | undefined;

        // Auto-initialize base global state safely on mount
        useEffect(() => {
            if (!instanceId || !module.initiated) return;
            
            if (initialValues?.data && stateData === undefined) {
                module.updateData({ [instanceId]: initialValues.data });
            }
            if (initialValues?.configs && configData === undefined) {
                module.updateConfigs({ [instanceId]: initialValues.configs });
            }
            if (initialValues?.userPrefs && prefData === undefined) {
                module.updateUserPreferences({ [instanceId]: initialValues.userPrefs });
            }
        }, [instanceId, module.initiated, stateData, configData, prefData]);

        // Bound Setters using partial updates
        const setGlobalState = useCallback((newState: Partial<TData>) => {
            const current = (stateData || initialValues?.data || {}) as TData;
            module.updateData({ [instanceId]: { ...current, ...newState } });
        }, [instanceId, stateData, module]);

        const setGlobalConfigs = useCallback((newConfigs: Partial<TConfigs>) => {
            const current = (configData || initialValues?.configs || {}) as TConfigs;
            module.updateConfigs({ [instanceId]: { ...current, ...newConfigs } });
        }, [instanceId, configData, module]);

        const setGlobalUserPrefs = useCallback((newPrefs: Partial<TPrefs>) => {
            const current = (prefData || initialValues?.userPrefs || {}) as TPrefs;
            module.updateUserPreferences({ [instanceId]: { ...current, ...newPrefs } });
        }, [instanceId, prefData, module]);

        // Memoize empty objects to prevent prop thrashing when undefined
        const safeData = stateData || initialValues?.data || ({} as TData);
        const safeConfigs = configData || initialValues?.configs || ({} as TConfigs);
        const safePrefs = prefData || initialValues?.userPrefs || ({} as TPrefs);

        return (
            <WrappedComponent 
                {...(restProps as P)}
                instanceId={instanceId}
                globalState={safeData}
                setGlobalState={setGlobalState}
                globalConfigs={safeConfigs}
                setGlobalConfigs={setGlobalConfigs}
                globalUserPrefs={safePrefs}
                setGlobalUserPrefs={setGlobalUserPrefs}
                createCallback={createCallback}
            />
        );
    }
}
