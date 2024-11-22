import { useState, useCallback, useRef } from 'react';

// Types for the action system
type ActionConfig = {
    id: string;
    trigger?: {
        component: React.ComponentType<any>;
        props?: Record<string, any>;
    };
    command?: {
        execute: (...args: any[]) => Promise<any> | any;
        onSuccess?: (result: any) => void;
        onError?: (error: any) => void;
    };
    presentation?: {
        component: React.ComponentType<any>;
        props?: Record<string, any>;
    };
    inline?: {
        component: React.ComponentType<any>;
        props?: Record<string, any>;
    };
};

type ActionState = {
    isPresentationOpen: boolean;
    isInlineVisible: boolean;
    isProcessing: boolean;
    error: Error | null;
    lastResult: any;
};

export const useActionManager = (actionConfig: ActionConfig) => {
    // Track state for this specific action instance
    const [state, setState] = useState<ActionState>({
        isPresentationOpen: false,
        isInlineVisible: false,
        isProcessing: false,
        error: null,
        lastResult: null
    });

    // Keep refs to the latest props and callbacks to avoid stale closures
    const configRef = useRef(actionConfig);
    configRef.current = actionConfig;

    // Handler for trigger activation
    const handleTrigger = useCallback(async (...args: any[]) => {
        const config = configRef.current;

        setState(prev => ({ ...prev, isProcessing: true, error: null }));

        try {
            // If there's a command but no presentation, execute directly
            if (config.command && !config.presentation) {
                const result = await config.command.execute(...args);
                setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    lastResult: result
                }));
                config.command.onSuccess?.(result);

                // Show inline if it exists after command
                if (config.inline) {
                    setState(prev => ({ ...prev, isInlineVisible: true }));
                }
            }
            // If there's a presentation, show it
            else if (config.presentation) {
                setState(prev => ({
                    ...prev,
                    isPresentationOpen: true,
                    isProcessing: false
                }));
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: error as Error
            }));
            config.command?.onError?.(error);
        }
    }, []);

    // Handler for presentation actions
    const handlePresentationClose = useCallback(async (result?: any) => {
        const config = configRef.current;

        setState(prev => ({
            ...prev,
            isPresentationOpen: false,
            lastResult: result
        }));

        // Execute command if it exists and wasn't executed by trigger
        if (config.command && result) {
            try {
                setState(prev => ({ ...prev, isProcessing: true }));
                const commandResult = await config.command.execute(result);
                config.command.onSuccess?.(commandResult);

                // Show inline if it exists
                if (config.inline) {
                    setState(prev => ({
                        ...prev,
                        isInlineVisible: true,
                        isProcessing: false
                    }));
                }
            } catch (error) {
                setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    error: error as Error
                }));
                config.command?.onError?.(error);
            }
        }
    }, []);

    // Handler for inline form actions
    const handleInlineSubmit = useCallback(async (data: any) => {
        const config = configRef.current;

        if (config.command) {
            try {
                setState(prev => ({ ...prev, isProcessing: true }));
                const result = await config.command.execute(data);
                setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    isInlineVisible: false,
                    lastResult: result
                }));
                config.command.onSuccess?.(result);
            } catch (error) {
                setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    error: error as Error
                }));
                config.command.onError?.(error);
            }
        }
    }, []);

    const handleInlineClose = useCallback(() => {
        setState(prev => ({ ...prev, isInlineVisible: false }));
    }, []);

    // Return everything needed to work with this action
    return {
        // State
        state,

        // Handlers
        handlers: {
            onTrigger: handleTrigger,
            onPresentationClose: handlePresentationClose,
            onInlineSubmit: handleInlineSubmit,
            onInlineClose: handleInlineClose
        },

        // Helper methods for rendering
        renderTrigger: (props: any) => {
            if (!actionConfig.trigger?.component) return null;
            const TriggerComponent = actionConfig.trigger.component;
            return (
                <TriggerComponent
                    {...actionConfig.trigger.props}
                    {...props}
                    onClick={handleTrigger}
                    disabled={state.isProcessing}
                />
            );
        },

        renderPresentation: (props: any) => {
            if (!actionConfig.presentation?.component || !state.isPresentationOpen) {
                return null;
            }
            const PresentationComponent = actionConfig.presentation.component;
            return (
                <PresentationComponent
                    {...actionConfig.presentation.props}
                    {...props}
                    onClose={handlePresentationClose}
                    isProcessing={state.isProcessing}
                    error={state.error}
                />
            );
        },

        renderInline: (props: any) => {
            if (!actionConfig.inline?.component || !state.isInlineVisible) {
                return null;
            }
            const InlineComponent = actionConfig.inline.component;
            return (
                <InlineComponent
                    {...actionConfig.inline.props}
                    {...props}
                    onSubmit={handleInlineSubmit}
                    onClose={handleInlineClose}
                    isProcessing={state.isProcessing}
                    error={state.error}
                />
            );
        }
    };
};
