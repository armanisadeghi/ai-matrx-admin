import React, {createContext, useContext, useCallback, useMemo, useState} from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {cn} from '@/utils/cn';

import {useDispatch, useSelector} from 'react-redux';
import {Button, Popover, PopoverContent, PopoverTrigger} from "@heroui/react";
import {
    DynamicFieldWrapper,
    DynamicFieldWrapperProps
} from "./DynamicFieldWrapper";
import {EntityField} from "@/types/entityTypes";

// Types for Action System
interface ActionConfig {
    trigger?: {
        type: 'icon' | 'button' | 'custom';
        component: React.ComponentType<any>;
        props?: Record<string, any>;
        position?: 'start' | 'end' | 'top' | 'bottom';
    };
    presentation?: {
        component: React.ComponentType<any>;
        props?: Record<string, any>;
        modal?: boolean;
    };
    command?: {
        type: 'redux' | 'saga' | 'function';
        action: string | Function;
        params?: Record<string, any>;
    };
    inline?: {
        component: React.ComponentType<any>;
        props?: Record<string, any>;
    };
}

interface ActionContextType {
    triggerAction: (actionId: string) => void;
    closePresentation: () => void;
    showInline: (config: any) => void;
    hideInline: () => void;
    dispatch: any;
    activePresentation: string | null;
    activeInline: any | null;
}

// Enhanced Context
const ActionContext = createContext<ActionContextType | undefined>(undefined);

// Custom hook for action management
const useAction = () => {
    const context = useContext(ActionContext);
    if (!context) {
        throw new Error('useAction must be used within an ActionProvider');
    }
    return context;
};

interface ActionWrapperProps extends DynamicFieldWrapperProps {
    actions?: Record<string, ActionConfig>;
    onActionComplete?: (result: any) => void;
    onInlineSubmit?: (data: any) => void;
}

const ActionWrapper: React.FC<ActionWrapperProps> = (
    {
        field,
        children,
        actions = {},
        onActionComplete,
        onInlineSubmit,
        ...wrapperProps
    }) => {
    const dispatch = useDispatch();
    const [activePresentation, setActivePresentation] = useState<string | null>(null);
    const [activeInline, setActiveInline] = useState<any | null>(null);
    const [inlinePosition, setInlinePosition] = useState<DOMRect | null>(null);

    // Action handlers
    const triggerAction = useCallback(async (actionId: string) => {
        const action = actions[actionId];
        if (!action) return;

        // Handle command
        if (action.command) {
            switch (action.command.type) {
                case 'redux':
                    dispatch({type: action.command.action, payload: action.command.params});
                    break;
                case 'saga':
                    dispatch({type: action.command.action, payload: action.command.params});
                    break;
                case 'function':
                    if (typeof action.command.action === 'function') {
                        await action.command.action(action.command.params);
                    }
                    break;
            }
        }

        // Show presentation if configured
        if (action.presentation) {
            setActivePresentation(actionId);
        }
    }, [actions, dispatch]);

    // Presentation handlers
    const closePresentation = useCallback(() => {
        setActivePresentation(null);
    }, []);

    // Inline form handlers
    const showInline = useCallback((config: any) => {
        setActiveInline(config);
    }, []);

    const hideInline = useCallback(() => {
        setActiveInline(null);
    }, []);

    // Context value
    const contextValue = useMemo(() => ({
        triggerAction,
        closePresentation,
        showInline,
        hideInline,
        dispatch,
        activePresentation,
        activeInline
    }), [triggerAction, closePresentation, showInline, hideInline, dispatch, activePresentation, activeInline]);

    // Render triggers
    const renderTriggers = useCallback(() => {
        return Object.entries(actions).map(([actionId, config]) => {
            if (!config.trigger) return null;

            const TriggerComponent = config.trigger.component;
            const position = config.trigger.position || 'end';

            return (
                <div
                    key={actionId}
                    className={cn(
                        'action-trigger',
                        position === 'start' && 'order-first',
                        position === 'end' && 'order-last',
                        position === 'top' && 'absolute top-2 right-2',
                        position === 'bottom' && 'absolute bottom-2 right-2'
                    )}
                >
                    <TriggerComponent
                        {...config.trigger.props}
                        onClick={() => triggerAction(actionId)}
                    />
                </div>
            );
        });
    }, [actions, triggerAction]);

    // Render active presentation
    const renderPresentation = useCallback(() => {
        if (!activePresentation || !actions[activePresentation]?.presentation) return null;

        const {component: PresentationComponent, props, modal} = actions[activePresentation].presentation!;

        const content = (
            <PresentationComponent
                {...props}
                onClose={closePresentation}
                onSubmit={(data: any) => {
                    onActionComplete?.(data);
                    closePresentation();
                }}
            />
        );

        return modal ? (
            <Popover isOpen={open} onOpenChange={handleOpenChange} backdrop="opaque">
                <PopoverTrigger>
                    <Button className="hidden">Open Modal</Button>
                </PopoverTrigger>
                <PopoverContent className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        {content}
                        <Button onClick={() => handleOpenChange(false)} className="mt-4">
                            Close
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        ) : (
                   content
               );
    }, [activePresentation, actions, closePresentation, onActionComplete]);

    // Render inline form
    const renderInline = useCallback(() => {
        if (!activeInline) return null;

        return (
            <motion.div
                initial={{opacity: 0, y: -10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -10}}
                className="mt-4"
            >
                {React.createElement(activeInline.component, {
                    ...activeInline.props,
                    onSubmit: (data: any) => {
                        onInlineSubmit?.(data);
                        hideInline();
                    },
                    onCancel: hideInline
                })}
            </motion.div>
        );
    }, [activeInline, hideInline, onInlineSubmit]);

    return (
        <ActionContext.Provider value={contextValue}>
            <DynamicFieldWrapper field={field} {...wrapperProps}>
                <div className="relative flex items-center gap-2">
                    {children}
                    {renderTriggers()}
                </div>
                <AnimatePresence>
                    {renderInline()}
                </AnimatePresence>
                {renderPresentation()}
            </DynamicFieldWrapper>
        </ActionContext.Provider>
    );
};

// Example usage components
const ActionField: React.FC<{
    field: EntityField;
    actions: Record<string, ActionConfig>;
    onActionComplete?: (result: any) => void;
}> = ({field, actions, onActionComplete}) => {
    return (
        <ActionWrapper
            field={field}
            actions={actions}
            onActionComplete={onActionComplete}
        >
            {/* Your field component here */}
        </ActionWrapper>
    );
};

export {
    ActionWrapper,
    ActionField,
    useAction,
    type ActionConfig,
    type ActionContextType
};
