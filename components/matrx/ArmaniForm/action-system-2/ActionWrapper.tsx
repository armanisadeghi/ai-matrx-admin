import React, {useState, useCallback, useMemo} from 'react';
import {DynamicFieldWrapper} from './DynamicFieldWrapper';
import {ActionConfig} from './actionTypes';
import {ActionContext} from './actionContext';
import {EntityField} from "../field-components/types";

interface ActionWrapperProps {
    field: EntityField;
    actions: ActionConfig[];
    children: React.ReactNode;
    wrapperProps?: any;
    onActionComplete?: (result: any) => void;
}

const ActionWrapper: React.FC<ActionWrapperProps> = (
    {
        field,
        actions,
        children,
        wrapperProps = {},
        onActionComplete,
    }) => {
    const [activePresentation, setActivePresentation] = useState<React.ReactNode | null>(null);
    const [activeInline, setActiveInline] = useState<React.ReactNode | null>(null);

    const handleAction = useCallback(async (actionId: string) => {
        const action = actions.find(a => a.id === actionId);
        if (!action) return;

        // Handle command if present
        if (action.commandConfig) {
            try {
                const result = await action.commandConfig.handler(action.commandConfig.params);
                onActionComplete?.(result);
            } catch (error) {
                console.error('Action command failed:', error);
            }
        }

        // Handle presentation if present
        if (action.presentationConfig) {
            const {component: PresentationComponent, props} = action.presentationConfig;
            setActivePresentation(
                <PresentationComponent
                    {...props}
                    onClose={() => setActivePresentation(null)}
                />
            );
        }
    }, [actions, onActionComplete]);

    const contextValue = useMemo(() => ({
        triggerAction: handleAction,
        closePresentation: () => setActivePresentation(null),
        showInline: (config: any) => setActiveInline(config),
        hideInline: () => setActiveInline(null),
    }), [handleAction]);

    const renderTriggers = () => {
        return actions.map(action => {
            if (!action.triggerConfig) return null;
            const {component: TriggerComponent, props, position = 'end'} = action.triggerConfig;

            return (
                <div
                    key={action.id}
                    className={`trigger-wrapper ${position}`}
                    onClick={() => handleAction(action.id)}
                >
                    <TriggerComponent {...props} />
                </div>
            );
        });
    };

    return (
        <ActionContext.Provider value={contextValue}>
            <DynamicFieldWrapper field={field} {...wrapperProps}>
                <div className="relative flex items-center gap-2">
                    {children}
                    {renderTriggers()}
                </div>
                {activeInline}
                {activePresentation}
            </DynamicFieldWrapper>
        </ActionContext.Provider>
    );
};

export default ActionWrapper;
