// CreateMode.tsx
import React from 'react';
import {ModeComponentProps} from './types';
import {Button} from "@/components/ui/button";
import {FormField} from "@/components/ui/form";
import FieldFactory from "@/app/(authenticated)/tests/crud-operations/components/FieldFactory";
import {EntityKeys} from "@/types/entityTypes";
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";


interface EntityBaseFieldProps {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful' | 'feedback' | 'error';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    variant?: MatrxVariant;
    labelPosition?: 'default' | 'left' | 'right' | 'top' | 'bottom';
    disabled?: boolean;
    floatingLabel?: boolean;
    className?: string;
}


export const CreateMode: React.FC<ModeComponentProps> = (
    {
        form,
        individualFieldInfo,
        entityKey,
        onModeChange
    }) => (
    <div className="p-4">

            <form onSubmit={form.form.handleSubmit(form.handleSave)} className="space-y-4">
                {individualFieldInfo.map(field => (
                    <FormField
                        key={field.name}
                        control={form.form.control}
                        name={field.name}
                        render={({field: formField}) => (
                            <FieldFactory
                                entityKey={entityKey}
                                dynamicFieldInfo={field}
                                formField={formField}
                                value={form.getFieldValue(field.name)}
                            />
                        )}
                    />
                ))}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            onModeChange('view');
                            form.handleCancel();
                        }}
                    >
                        Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                </div>
            </form>

    </div>
);
