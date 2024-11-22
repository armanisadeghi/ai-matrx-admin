/*
// Example usage:
// components/ComplexForm.tsx
import { ActionFormField } from '../components/ActionFormField';
import { PlusIcon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import FormField from '../components/FormField';

const ComplexForm = () => {
    const dispatch = useDispatch();

    return (
        <div className="space-y-4">
            {/!* Regular form field *!/}
            <FormField
                label="name"
                type="text"
                // ...regular props
            />

            {/!* Action-enabled form field *!/}
            <ActionFormField
                actionId="add-parameter"  // Unique ID for this action instance
                label="parameters"
                type="array"
                trigger={{
                    icon: PlusIcon,
                    variant: 'icon',
                    position: 'right'
                }}
                presentation={{
                    component: AddParameterModal,
                    props: {
                        // Modal-specific props
                    }
                }}
                command={{
                    execute: async (parameterData) => {
                        // Dispatch Redux action
                        await dispatch(addParameter(parameterData));
                        return parameterData;
                    },
                    onSuccess: (result) => {
                        // Handle success
                        dispatch(showNotification('Parameter added'));
                    }
                }}
                inline={{
                    component: ParameterInlineForm,
                    props: {
                        // Inline form specific props
                    }
                }}
            />

            {/!* Can have multiple action fields *!/}
            <ActionFormField
                actionId="add-validation"
                label="validations"
                // ... another action configuration
            />
        </div>
    );
};


// Nested action example:
// components/ParameterInlineForm.tsx
const ParameterInlineForm: React.FC<any> = ({ onSubmit, onClose }) => {
    return (
        <div className="border rounded p-4">
            {/!* This inline form can contain its own action fields *!/}
            <ActionFormField
                actionId="parameter-condition"
                label="condition"
                trigger={{
                    icon: CodeIcon,
                    variant: 'button'
                }}
                // ... nested action configuration
            />
        </div>
    );
};
*/
