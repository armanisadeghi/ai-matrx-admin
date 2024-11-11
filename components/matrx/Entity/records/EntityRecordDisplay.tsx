// components/matrx/Entity/records/EntityRecordDisplay.tsx
'use client';

import React, {useEffect} from 'react';
import {FlexAnimatedForm} from '@/components/matrx/AnimatedForm';
import {useEntity} from '@/lib/redux/entity/useEntity';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {
    EntityFormState,
    FlexEntityFormProps,
} from '@/components/matrx/Entity/types/entityForm';
import {MatrxFormLoading} from "@/components/matrx/LoadingComponents";
import {EntityError, MatrxRecordId} from '@/lib/redux/entity/types';
import {createRecordKey} from '@/lib/redux/entity/utils';
import {transformFieldsToFormFields} from '@/components/matrx/Entity/addOns/mapDataTypeToFormFieldType';

function EntityRecordDisplay(
    {
        entityName,
        primaryKeyField,
        primaryKeyValue
    }: {
        entityName: EntityKeys;
        primaryKeyField: string;
        primaryKeyValue: string;
    }) {
    const entity = useEntity(entityName);
    const [error, setError] = React.useState<EntityError | null>(null);
    const [isInitialLoad, setIsInitialLoad] = React.useState(true);

    useEffect(() => {
        if (!entity.entityMetadata) return;

        if (isInitialLoad) {
            const primaryKeyValues = {
                [primaryKeyField]: primaryKeyValue
            } as Record<string, MatrxRecordId>;

            entity.fetchOne(primaryKeyValues);
            setIsInitialLoad(false);
        }
    }, [entity.entityMetadata, isInitialLoad]);

    useEffect(() => {
        if (!entity.entityMetadata?.primaryKeyMetadata || isInitialLoad) return;

        const primaryKeyValues = {
            [primaryKeyField]: primaryKeyValue
        } as Record<string, MatrxRecordId>;

        const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
        const record = entity.allRecords[recordKey];

        if (record && !entity.loadingState.loading) {
            entity.setSelection([record], 'single');
            setError(null);
        } else if (!entity.loadingState.loading && !record) {
            setError({
                message: 'Record not found',
                details: `No record found for ${primaryKeyField}: ${primaryKeyValue}`,
                lastOperation: 'fetch'
            });
        }
    }, [entity.allRecords, entity.loadingState.loading, entity.entityMetadata]);

    const formProps: FlexEntityFormProps = React.useMemo(() => {
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
            formState: entity.activeRecord as EntityFormState,
            onUpdateField: (name: string, value: any) => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;

                const primaryKeyValues = entity.primaryKeyMetadata.fields.reduce((acc, field) => ({
                    ...acc,
                    [field]: entity.activeRecord[field]
                }), {} as Record<string, MatrxRecordId>);

                const update = {
                    [name]: value
                } as Partial<EntityData<typeof entityName>>;

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
    }, [entity.fieldInfo, entity.primaryKeyMetadata, entityName, entity]);

    if (!entity.entityMetadata) {
        return <MatrxFormLoading/>;
    }

    if (entity.loadingState.loading) {
        return <MatrxFormLoading/>;
    }

    if (error) {
        return (
            <div className="p-4 text-red-500">
                Error: {error.message}
                {error.details && (
                    <div className="mt-2 text-sm">
                        {error.details.toString()}
                    </div>
                )}
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

export default EntityRecordDisplay;
