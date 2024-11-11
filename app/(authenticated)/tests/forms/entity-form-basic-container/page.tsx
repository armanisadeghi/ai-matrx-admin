// app/(authenticated)/tests/forms/entity-form-basic-container
'use client';

import React, {useState, useMemo} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {FlexAnimatedForm} from '@/components/matrx/AnimatedForm';
import {useEntity} from '@/lib/redux/entity/useEntity';
import {EntityKeys} from '@/types/entityTypes';
import {
    EntityFormState,
    FlexEntityFormProps,
    EntityFlexFormField,
    FormFieldType
} from '@/components/matrx/Entity/types/entityForm';
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import PreWiredEntityRecordHeader from '@/components/matrx/Entity/records/PreWiredEntityRecordHeaderBasic';
import {createRecordKey} from '@/lib/redux/entity/utils';

const EntityFormContainer = (
    {
        entityKey,
        primaryKeyValues
    }: {
        entityKey: EntityKeys;
        primaryKeyValues: Record<string, any> | null;
    }) => {
    const entity = useEntity(entityKey);

    // Fetch the record when primaryKeyValues change
    React.useEffect(() => {
        if (primaryKeyValues) {
            entity.fetchOne(primaryKeyValues);
        }
    }, [primaryKeyValues, entity]);

    // Set selection when record is loaded
    React.useEffect(() => {
        if (primaryKeyValues && entity.entityMetadata?.primaryKeyMetadata) {
            const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
            const record = entity.allRecords[recordKey];

            if (record && !entity.loadingState.loading) {
                entity.setSelection([record], 'single');
            }
        }
    }, [primaryKeyValues, entity.allRecords, entity.loadingState.loading, entity.entityMetadata?.primaryKeyMetadata]);

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
            {entity.activeRecord && (
                <FlexAnimatedForm {...formProps} />
            )}
        </div>
    );
};

const DynamicEntityForm: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);

    const handleEntityChange = (entity: EntityKeys | null) => {
        setSelectedEntity(entity);
        setSelectedRecord(null);
    };

    return (
        <Card className="w-full">
            <PreWiredEntityRecordHeader
                onEntityChange={handleEntityChange}
                onRecordChange={setSelectedRecord}
            />
            <CardContent>
                {selectedEntity ? (
                    <EntityFormContainer
                        entityKey={selectedEntity}
                        primaryKeyValues={selectedRecord}
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


// For Reference ========================================


/*
interface EntityFormState {
    [key: string]: any;
}

interface FlexEntityFormProps {
    fields: EntityFlexFormField[];
    formState: EntityFormState;
    onUpdateField: (name: string, value: any) => void;
    onSubmit: () => void;
    currentStep?: number;
    onNextStep?: () => void;
    onPrevStep?: () => void;
    isSinglePage?: boolean;
    className?: string;
    isFullPage?: boolean;
    columns?: number | 'auto' | { xs: number, sm: number, md: number, lg: number, xl: number };
    layout?: 'grid' | 'sections' | 'accordion' | 'tabs' | 'masonry' | 'carousel' | 'timeline';
    enableSearch?: boolean;
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
}

interface EntityFlexFormField {
    name: string;
    label: string;
    type: FormFieldType;
    options?: string[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    section?: string;
    min?: number;
    max?: number;
    step?: number;
    accept?: string;
    multiple?: boolean;
    src?: string;
    alt?: string;
    jsonSchema?: object;
}

type FormFieldType =
    'text'
    | 'email'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'password'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'month'
    | 'week'
    | 'tel'
    | 'url'
    | 'color'
    | 'slider'
    | 'switch'
    | 'json'
    | 'file'
    | 'image'
    | 'rating';

*/
