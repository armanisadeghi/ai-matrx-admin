import React, {useState} from 'react';
import {useAppDispatch} from '@/lib/redux/hooks';
import FieldAction from "./FieldAction";
import {createMatrxAction} from "./action-creator";
import InlineFormCard from './InlineFormCard';


const ActionFieldWrapper = ({
                                field,
                                value,
                                onChange,
                                renderBaseField,
                                density = 'normal',
                                animationPreset = 'smooth',
                                renderField
                            }) => {
    console.log('ActionFieldWrapper mounted for:', {
        fieldName: field.name,
        hasActionKeys: !!field.actionKeys,
        hasInlineFields: !!field.inlineFields
    });

    const [activeInlineForm, setActiveInlineForm] = useState(null);
    const dispatch = useAppDispatch();
    const actionMap = React.useMemo(() => createMatrxAction(dispatch), [dispatch]);

    // Move this check up to renderField
    return (
        <div className="relative w-full">
            <div className="relative">
                {renderBaseField()}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {field.actionKeys?.map((actionKey, index) => {
                        console.log('Rendering action:', actionKey);
                        const action = actionMap[actionKey];
                        if (!action) return null;

                        return (
                            <FieldAction
                                key={index}
                                action={action}
                                field={field}
                                value={value}
                                onChange={onChange}
                                fieldComponentProps={field.componentProps}
                                density={density}
                                animationPreset={animationPreset}
                                onActionComplete={(isOpen) => {
                                    console.log('Action completed:', { isOpen, actionKey });
                                    if (!isOpen) {
                                        setActiveInlineForm(actionKey);
                                    }
                                }}
                            />
                        );
                    })}
                </div>
            </div>
            {activeInlineForm && field.inlineFields && (
                <InlineFormCard
                    parentField={field}
                    actionMap={actionMap}
                    onClose={() => setActiveInlineForm(null)}
                    density={density}
                    animationPreset={animationPreset}
                    renderField={renderField}
                />
            )}
        </div>
    );
};

export default ActionFieldWrapper;
