// components/ActionFormField.tsx
import React from 'react';
import FormField from './FormField';
import {useActionManager} from '../hooks/useActionManager';
import {ActionFieldConfig} from '../types';

export const ActionFormField: React.FC<ActionFieldConfig> = (
    {
        actionId,
        trigger,
        presentation,
        command,
        inline,
        ...formFieldProps
    }) => {
    // Initialize action manager for this specific field
    const action = useActionManager({
        id: actionId,
        trigger: trigger && {
            component: ({onClick, disabled}) => (
                <div
                    className={`absolute ${trigger.position === 'left' ? 'left-2' : 'right-2'} 
                     flex items-center h-full`}
                >
                    {trigger.icon && React.createElement(trigger.icon, {
                        className: 'w-4 h-4',
                        onClick,
                        disabled
                    })}
                </div>
            ),
            props: {variant: trigger.variant}
        },
        presentation,
        command,
        inline
    });

    // Wrap the form field with action-aware container
    return (
        <div className="relative">
            <FormField {...formFieldProps} />

            {/* Render trigger inside the form field */}
            {action.renderTrigger({
                className: 'z-10'  // Ensure trigger is above field content
            })}

            {/* Render presentation (modal, dialog, etc) */}
            {action.renderPresentation({
                // Additional presentation props if needed
            })}

            {/* Render inline form if active */}
            {action.renderInline({
                className: 'mt-2'  // Space between field and inline form
            })}
        </div>
    );
};
