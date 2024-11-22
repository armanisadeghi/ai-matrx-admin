'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
import { mapFieldDataTypeToFormFieldType } from "@/components/matrx/Entity/addOns/mapDataTypeToFormFieldType";
import ArmaniForm from '@/components/matrx/ArmaniForm/ArmaniForm';

// Memoized Configurations
const DEFAULT_FORM_CONFIG = {
    layout: 'grid' as const,
    direction: 'row' as const,
    enableSearch: false,
    columns: 2,
    isSinglePage: true,
    isFullPage: true
};

const createTransformedFields = (entityFields: EntityStateField[]): EntityFlexFormField[] => {
    if (!entityFields) return [];

    return entityFields.map(field => ({
        name: field.name,
        label: field.displayName || field.name,
        type: mapFieldDataTypeToFormFieldType(field.dataType) as FormFieldType,
        required: field.isRequired,
        disabled: false,
        defaultValue: field.defaultValue,
        validationFunctions: field.validationFunctions,
        maxLength: field.maxLength,
        subComponent: null,
        actionKeys: field.defaultComponent === 'inline-form:1' ? ['entityQuickSidebar'] : [],
        actionProps: {},
        defaultComponent: field.defaultComponent,
        componentProps: field.componentProps,
    }));
};

interface EntityContentProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

function EntityContent<TEntity extends EntityKeys>({ entityKey }: EntityContentProps<TEntity>) {
    const entity = useEntity(entityKey);
    const [formData, setFormData] = useState<EntityFormState>({});

    // Memoize MatrxRecordId generation
    const getMatrxRecordId = useCallback(() => {
        if (!entity.activeRecord || !entity.primaryKeyMetadata) return null;

        return entity.primaryKeyMetadata.fields.reduce((acc, field) => ({
            ...acc,
            [field]: entity.activeRecord[field]
        }), {} as Record<string, MatrxRecordId>);
    }, [entity.activeRecord, entity.primaryKeyMetadata]);

    // Memoize field update handler
    const handleFieldUpdate = useCallback((name: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        const matrxRecordId = getMatrxRecordId() as unknown as MatrxRecordId;
        if (!matrxRecordId) return;

        const update = {
            [name]: value
        } as Partial<EntityData<TEntity>>;

        entity.updateRecord(matrxRecordId, update, { showToast: true });
    }, [entity, getMatrxRecordId]);

    // Memoize CRUD handlers
    const handleSubmit = useCallback(() => {
        const matrxRecordId = getMatrxRecordId() as unknown as MatrxRecordId;
        if (!matrxRecordId) return;

        entity.updateRecord(matrxRecordId, formData, {
            showToast: true,
            callback: () => console.log('Form submitted:', formData)
        });
    }, [entity, formData, getMatrxRecordId]);

    // Sync form data with active record
    React.useEffect(() => {
        if (entity.activeRecord) {
            setFormData(entity.activeRecord as EntityFormState);
        }
    }, [entity.activeRecord]);

    // Memoize form fields
    const formFields = useMemo(() =>
            createTransformedFields(entity.fieldInfo),
        [entity.fieldInfo]
    );

    // Memoize form props
    const formProps: FlexEntityFormProps = useMemo(() => ({
        fields: formFields,
        formState: formData,
        onUpdateField: handleFieldUpdate,
        onSubmit: handleSubmit,
        ...DEFAULT_FORM_CONFIG
    }), [formFields, formData, handleFieldUpdate, handleSubmit]);

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
                <ArmaniForm{...formProps} />
            )}
        </div>
    );
}

// Memoize EntityContent
const MemoizedEntityContent = React.memo(EntityContent, (prev, next) =>
    prev.entityKey === next.entityKey
);

interface DynamicEntityFormState {
    selectedEntity: EntityKeys | null;
    error: EntityError | null;
}

const DynamicEntityForm: React.FC = () => {
    const [state, setState] = useState<DynamicEntityFormState>({
        selectedEntity: null,
        error: null
    });

    // Memoize handlers
    const handleEntityChange = useCallback((entityKey: EntityKeys | null) => {
        setState(prev => ({
            ...prev,
            error: null,
            selectedEntity: entityKey
        }));
    }, []);

    const handleRecordLoad = useCallback((record: EntityData<EntityKeys>) => {
        console.log('Record loaded:', record);
        setState(prev => ({
            ...prev,
            error: null
        }));
    }, []);

    const handleError = useCallback((error: EntityError) => {
        console.error('Entity error:', error);
        setState(prev => ({
            ...prev,
            error
        }));
    }, []);

    // Memoize header props
    const headerProps = useMemo(() => ({
        onEntityChange: handleEntityChange,
        onRecordLoad: handleRecordLoad,
        onError: handleError
    }), [handleEntityChange, handleRecordLoad, handleError]);

    return (
        <Card className="w-full">
            <PreWiredEntityRecordHeader {...headerProps} />
            <CardContent>
                {state.error && (
                    <div className="text-red-500 mb-4">
                        Error: {state.error.message}
                    </div>
                )}
                {state.selectedEntity ? (
                    <MemoizedEntityContent
                        entityKey={state.selectedEntity}
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

export default React.memo(DynamicEntityForm);
