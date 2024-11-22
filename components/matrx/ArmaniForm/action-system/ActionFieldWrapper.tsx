import React, {useState} from 'react';
import FieldAction from "./FieldAction";
import {createMatrxActions} from "./action-creator";
import InlineFormCard from './InlineFormCard';


const ActionFieldWrapper = (
    {
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
    const matrxActionConfig = createMatrxActions(field.actionKeys);

    return (
        <div className="relative w-full">
            <div className="relative">
                {renderBaseField()}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {field.actionKeys?.map((matrxActionKey, index) => {
                        console.log('Rendering action:', matrxActionKey);
                        const matrxAction = matrxActionConfig[matrxActionKey];
                        if (!matrxAction) return null;

                        return (
                            <FieldAction
                                key={index}
                                matrxAction={matrxAction}
                                field={field}
                                value={value}
                                onChange={onChange}
                                fieldComponentProps={field.componentProps}
                                density={density}
                                animationPreset={animationPreset}
                                onActionComplete={(isOpen) => {
                                    console.log('Action completed:', {isOpen, matrxActionKey});
                                    if (!isOpen) {
                                        setActiveInlineForm(matrxActionKey);
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
                    actionMap={matrxActionConfig}
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
