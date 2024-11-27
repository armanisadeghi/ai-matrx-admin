// app/(authenticated)/tests/forms/entity-form/page.tsx
'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import PreWiredCardHeader from '@/components/matrx/Entity/EntityCardHeaderSelect';
import {FlexAnimatedForm} from '@/components/matrx/AnimatedForm';
import {useEntity} from '@/lib/redux/entity/useEntity';
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {QuickReferenceRecord} from '@/lib/redux/entity/types';
import {
    FlexEntityFormProps,
    EntityFlexFormField,
    FormFieldType
} from '@/components/matrx/Entity/types/entityForm';
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import {createRecordKey} from '@/lib/redux/entity/utils';

const EntityFormContainer = ({entityKey}: { entityKey: EntityKeys }) => {
    const entity = useEntity(entityKey);
    const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
    const [currentPrimaryKeyValues, setCurrentPrimaryKeyValues] = useState<Record<string, any> | null>(null);

    const matrxRecordId = createRecordKey(entity.entityMetadata.primaryKeyMetadata, currentPrimaryKeyValues);

    const currentRecord = useMemo(() => {
        if (!matrxRecordId) return null;
        return entity.allRecords[matrxRecordId];
    }, [matrxRecordId]);


    useEffect(() => {
        if (entityKey) {
            entity.fetchQuickReference();
        }
    }, [entityKey]);


    const handleRecordSelect = async (value: string) => {
        console.log('Selected record key:', value);
        setSelectedRecordKey(value);

        const primaryKeyValues = JSON.parse(value);
        console.log('Selected record primaryKeyValues:', primaryKeyValues);
        setCurrentPrimaryKeyValues(primaryKeyValues);

        entity.fetchOne(matrxRecordId);
    };

    useEffect(() => {
        if (currentRecord && !entity.loadingState.loading) {
            entity.setSelection([currentRecord], 'single');
            console.log('Selected record:', entity.selectedRecords);
        }
    }, [currentRecord, entity.loadingState.loading]);


    const transformFieldsToFormFields = (entityFields: any[]): EntityFlexFormField[] => {
        if (!entityFields) return [];

        return entityFields.map(field => ({
            name: field.name,
            label: field.displayName || field.name,
            type: field.dataType as FormFieldType,
            required: field.isRequired,
            disabled: false,
        }));
    };

    const quickReferenceOptions = useMemo(() => {
        if (!entity?.quickReference) return [];

        return entity.quickReference.map((record: QuickReferenceRecord) => ({
            value: JSON.stringify(record.primaryKeyValues),
            label: record.displayValue || JSON.stringify(record.primaryKeyValues)
        }));
    }, [entity?.quickReference]);

    const formProps: FlexEntityFormProps = useMemo(() => {
        if (!entity?.activeRecord) {
            return {
                fields: [],
                formState: {},
                onUpdateField: () => {
                },
                onSubmit: () => {
                },
            };
        }

        const formFields = transformFieldsToFormFields(entity.fieldInfo);

        return {
            fields: formFields,
            formState: entity.activeRecord as EntityData<EntityKeys>,
            onUpdateField: (name: string, value: any) => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;

                entity.updateRecord(
                    entity.primaryKeyMetadata.fields.reduce((acc, field) => ({
                        ...acc,
                        [field]: entity.activeRecord[field]
                    }), {}),
                    {[name]: value}
                );
            },
            onSubmit: () => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;
                console.log('Form submitted:', entity.activeRecord);
            },
            layout: 'grid',
            direction: 'row',
            enableSearch: false,
            columns: 2,
            isSinglePage: true,
            isFullPage: true
        };
    }, [entity.fieldInfo, entity.primaryKeyMetadata, entity]);

    if (!entity.entityMetadata) {
        return <MatrxTableLoading/>;
    }

    return (
        <div className="p-4">
            <Select
                value={selectedRecordKey || ''}
                onValueChange={handleRecordSelect}
            >
                <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Select a record"/>
                </SelectTrigger>
                <SelectContent>
                    {quickReferenceOptions.map(({value, label}) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {entity.activeRecord && (
                <FlexAnimatedForm {...formProps} />
            )}
        </div>
    );
};

const DynamicEntityForm: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);

    return (
        <Card className="w-full">
            <PreWiredCardHeader onEntityChange={setSelectedEntity}/>
            <CardContent>
                {selectedEntity ? (
                    <EntityFormContainer entityKey={selectedEntity}/>
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
