// EditMode.tsx
import React from 'react';
import {ModeComponentProps} from './types';
import {Button} from "@/components/ui/button";
import FieldFactory from "@/app/(authenticated)/tests/crud-operations/components/FieldFactory";
import {FormField} from '@/components/ui/form';

export const EditMode: React.FC<ModeComponentProps> = (
    {
        form,
        individualFieldInfo,
        entityKey,
        matrxRecordId,
        record,
        expandedFields,
        toggleFieldExpansion,
        truncateText,
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
                    <Button type="submit">Save</Button>
                </div>
            </form>
    </div>
);
