// app/(authenticated)/tests/forms/entity-form-full-container/page.tsx

'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FlexAnimatedForm } from '@/components/matrx/AnimatedForm';
import { useEntity } from '@/lib/redux/entity/useEntity';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import {
    EntityFormState,
    FlexEntityFormProps,
    EntityFlexFormField,
    FormFieldType
} from '@/components/matrx/Entity/types/entityForm';
import { MatrxTableLoading } from "@/components/matrx/LoadingComponents";
import PreWiredEntityRecordHeader from '@/components/matrx/Entity/records/PreWiredEntityRecordHeader';
import { EntityError, EntityStateField, MatrxRecordId } from '@/lib/redux/entity/types';
import {mapFieldDataTypeToFormFieldType} from "@/components/matrx/Entity/addOns/mapDataTypeToFormFieldType";

interface EntityContentProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

function EntityContent<TEntity extends EntityKeys>({ entityKey }: EntityContentProps<TEntity>) {
    const entity = useEntity(entityKey);

    const transformFieldsToFormFields = (entityFields: EntityStateField[]): EntityFlexFormField[] => {
        if (!entityFields) return [];

        return entityFields.map(field => ({
            name: field.name,
            label: field.displayName || field.name,
            type: mapFieldDataTypeToFormFieldType(field.dataType) as FormFieldType,
            required: field.isRequired,
            disabled: false,
            defaultValue: field.defaultValue,
            validation: field.validationFunctions,
            maxLength: field.maxLength
        }));
    };

    const formProps: FlexEntityFormProps = React.useMemo(() => {
        if (!entity?.activeRecord) {
            return {
                fields: [],
                formState: {},
                onUpdateField: () => {},
                onSubmit: () => {},
            };
        }

        const formFields = transformFieldsToFormFields(entity.fieldInfo);

        return {
            fields: formFields,
            formState: entity.activeRecord as EntityFormState,
            onUpdateField: (name: string, value: any) => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;

                const primaryKeyValues = entity.primaryKeyMetadata.fields.reduce((acc, field) => ({
                    ...acc,
                    [field]: entity.activeRecord[field]
                }), {} as Record<string, MatrxRecordId>);

                const update = {
                    [name]: value
                } as Partial<EntityData<TEntity>>;

                entity.updateRecord(primaryKeyValues, update);
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
        return <MatrxTableLoading />;
    }

    if (entity.loadingState.error) {
        return (
            <div className="p-4 text-red-500">
                Error: {entity.loadingState.error.message}
            </div>
        );
    }

    return (
        <div className="p-4">
            {entity.activeRecord && (
                <FlexAnimatedForm {...formProps} />
            )}
        </div>
    );
}

const DynamicEntityForm: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [error, setError] = useState<EntityError | null>(null);

    const handleEntityChange = (entityKey: EntityKeys | null) => {
        setError(null);
        setSelectedEntity(entityKey);
    };

    const handleRecordLoad = (record: EntityData<EntityKeys>) => {
        console.log('Record loaded:', record);
        setError(null);
    };

    const handleError = (error: EntityError) => {
        console.error('Entity error:', error);
        setError(error);
    };

    return (
        <Card className="w-full">
            <PreWiredEntityRecordHeader
                onEntityChange={handleEntityChange}
                onRecordLoad={handleRecordLoad}
                onError={handleError}
            />
            <CardContent>
                {error && (
                    <div className="text-red-500 mb-4">
                        Error: {error.message}
                    </div>
                )}
                {selectedEntity ? (
                    <EntityContent
                        entityKey={selectedEntity}
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
