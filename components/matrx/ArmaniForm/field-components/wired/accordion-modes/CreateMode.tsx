// CreateMode.tsx
import React from 'react';
import {ModeComponentProps} from './types';
import {Button} from "@/components/ui/button";
import {FormField} from "@/components/ui/form";
import FieldFactory from "@/app/(authenticated)/tests/crud-operations/components/FieldFactory";

export const CreateMode: React.FC<ModeComponentProps> = (
    {
        form,
        dynamicFieldInfo,
        entityKey,
        onModeChange
    }) => (
    <div className="p-4">
        <form onSubmit={form.form.handleSubmit(form.handleSave)} className="space-y-4">
            {dynamicFieldInfo.map(field => (
                <FormField
                    key={field.name}
                    control={form.form.control}
                    name={field.name}
                    render={({field: formField}) => (
                        <FieldFactory
                            entityKey={entityKey}
                            field={field}
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
