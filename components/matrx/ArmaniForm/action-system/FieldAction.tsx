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

    const actionProps = useFieldActions({
        field,
        matrxAction,
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
