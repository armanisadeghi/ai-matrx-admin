'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FlexAnimatedForm } from '@/components/matrx/AnimatedForm';
import { EntityKeys } from '@/types/entityTypes';
import {
    EntityFormState,
    FlexEntityFormProps,
    EntityFlexFormField,
    FormFieldType
} from '@/components/matrx/Entity/types/entityForm';
import PreWiredEntityRecordHeader from '@/components/matrx/Entity/records/PreWiredEntityRecordHeader';

const EntityFormContainer = ({ record, onUpdate }: { record: any; onUpdate: (name: string, value: any) => void }) => {
    const transformFieldsToFormFields = (entityFields: any[]): EntityFlexFormField[] => {
        if (!entityFields) return [];

        return entityFields.map(field => ({
            name: field.name,
            label: field.displayName || field.name,
            type: 'text' as FormFieldType,
            required: false,
            disabled: false
        }));
    };

    const formProps: FlexEntityFormProps = useMemo(() => {
        if (!record) {
            return {
                fields: [],
                formState: {},
                onUpdateField: () => {},
                onSubmit: () => {},
            };
        }

        return {
            fields: transformFieldsToFormFields(record.fieldInfo),
            formState: record as EntityFormState,
            onUpdateField: onUpdate,
            onSubmit: () => {
                console.log('Form submitted:', record);
            },
            layout: 'grid',
            direction: 'row',
            enableSearch: false,
            columns: 2,
            isSinglePage: true,
            isFullPage: true
        };
    }, [record]);

    if (!record) return null;

    return (
        <div className="p-4">
            <FlexAnimatedForm {...formProps} />
        </div>
    );
};

const DynamicEntityForm: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [activeRecord, setActiveRecord] = useState<any>(null);

    const handleRecordLoad = (record: any) => {
        setActiveRecord(record);
    };

    const handleFieldUpdate = (name: string, value: any) => {
        if (!activeRecord) return;

        setActiveRecord({
            ...activeRecord,
            [name]: value
        });
    };

    return (
        <Card className="w-full">
            <PreWiredEntityRecordHeader
                onEntityChange={setSelectedEntity}
                onRecordLoad={handleRecordLoad}
            />
            <CardContent>
                {selectedEntity ? (
                    <EntityFormContainer
                        record={activeRecord}
                        onUpdate={handleFieldUpdate}
                    />
                ) : (
                     <div className="text-center py-8 text-muted-foreground">
                         Select an entity to view its data
                     </div>
                 )}
            </CardContent>
        </Card>
    );
};

export default DynamicEntityForm;
