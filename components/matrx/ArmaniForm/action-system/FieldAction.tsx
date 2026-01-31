import React from "react";
import { ActionRegistryEntry} from "./types";
import { useFieldActions} from "./hooks/useFieldActions";


interface FieldActionProps {
    matrxAction: ActionRegistryEntry;
    field: any;
    value: any;
    onChange: (value: any) => void;
    density?: string;
    animationPreset?: string;
    onActionComplete?: (isOpen: boolean) => void;
}

const FieldAction: React.FC<FieldActionProps> = (
    {
        matrxAction,
        field,
        value,
        onChange,
        onActionComplete,
        density = 'normal',
        animationPreset = 'smooth'
    }) => {

    // @ts-ignore - COMPLEX: matrxAction type mismatch - expects array but receives single entry. Type definition needs review.
    const actionProps = useFieldActions({
        field,
        matrxAction: [matrxAction],
        value,
        onChange,
        onActionComplete
    });

    const entityKey = "registeredFunction";


    return (
        <>
            {actionProps.map((props, index) => {
                const action = matrxAction[index];
                const PresentationComponent = action.presentationConfig.component;
                const TriggerComponent = action.triggerConfig.component;
                const ActionComponent = action.actionComponentConfig?.component;

                const trigger = <TriggerComponent {...props.triggerProps} />;
                // @ts-ignore - COMPLEX: Spread types may only be created from object types - entityKey is string, needs object
                const content = ActionComponent ? <ActionComponent {...entityKey} /> : null;

                return (
                    <PresentationComponent
                        key={index}
                        {...props.presentationProps}
                        trigger={trigger}
                        content={content}
                    />
                );
            })}
        </>
    );
};

export default FieldAction;
