'use client';

import React, {useState, useCallback, useMemo} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {FlexAnimatedForm} from '@/components/matrx/AnimatedForm';
import {useEntity} from '@/lib/redux/entity/useEntity';
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {
    EntityFormState,
    FlexEntityFormProps,
    EntityFlexFormField,
    FormFieldType
} from '@/components/matrx/Entity/types/entityForm';
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import PreWiredEntityRecordHeader from '@/components/matrx/Entity/records/PreWiredEntityRecordHeaderBasic';

// Memoized field transformation function
const createTransformedFields = (entityFields: any[]): EntityFlexFormField[] => {
    if (!entityFields) return [];
    return entityFields.map(field => ({
        name: field.name,
        label: field.displayName || field.name,
        type: 'text' as FormFieldType,
        required: false,
        disabled: false
    }));
};

// Memoized form configuration
const DEFAULT_FORM_CONFIG = {
    layout: 'grid' as const,
    direction: 'row' as const,
    enableSearch: false,
    columns: 2,
    isSinglePage: true,
    isFullPage: true
};

const EntityFormContainer = React.memo((
    {
        entityKey,
        primaryKeyValues
    }: {
        entityKey: EntityKeys;
        primaryKeyValues: Record<string, any> | null;
    }) => {
    const entity = useEntity(entityKey);
    const [formData, setFormData] = useState<EntityFormState>({});

    const matrxRecordId = useMemo(() => {
        return primaryKeyValues ? entity.matrxRecordIdByPrimaryKey(primaryKeyValues) : null;
    }, [primaryKeyValues, entity]);

    // Memoized field update handler
    const handleFieldUpdate = useCallback((fieldName: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    }, []);

    // Memoized CRUD handlers
    const handleUpdate = useCallback((data: EntityData<EntityKeys>) => {
        if (!matrxRecordId) return;
        entity.updateRecord(matrxRecordId, data, {showToast: true});
    }, [entity, matrxRecordId]);

    const handleCreate = useCallback((data: EntityData<EntityKeys>) => {
        entity.createRecord(data, {showToast: true});
    }, [entity]);

    const handleDelete = useCallback(() => {
        if (!matrxRecordId) return;
        entity.deleteRecord(matrxRecordId, {showToast: true});
    }, [entity, matrxRecordId]);

    // Effects
    React.useEffect(() => {
        if (primaryKeyValues) {
            entity.fetchOne(primaryKeyValues);
        }
    }, [primaryKeyValues, entity]);

    React.useEffect(() => {
        if (matrxRecordId && !entity.loadingState.loading) {
            entity.handleSingleSelection(matrxRecordId);
        }
    }, [matrxRecordId, entity]);

    React.useEffect(() => {
        if (entity.activeRecord) {
            setFormData(entity.activeRecord as EntityFormState);
        }
    }, [entity.activeRecord]);

    // Memoize transformed fields
    const formFields = useMemo(() =>
            createTransformedFields(entity.fieldInfo),
        [entity.fieldInfo]
    );

    // Memoize form props
    const formProps: FlexEntityFormProps = useMemo(() => ({
        fields: formFields,
        formState: formData,
        onUpdateField: handleFieldUpdate,
        onSubmitUpdate: handleUpdate,
        onSubmitCreate: handleCreate,
        onSubmitDelete: handleDelete,
        ...DEFAULT_FORM_CONFIG
    }), [
        formFields,
        formData,
        handleFieldUpdate,
        handleUpdate,
        handleCreate,
        handleDelete
    ]);

    if (!entity.entityMetadata) {
        return <MatrxTableLoading/>;
    }

    return (
        <div className="p-4">
            {(entity.activeRecord || !primaryKeyValues) && (
                <FlexAnimatedForm {...formProps} />
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.entityKey === nextProps.entityKey &&
        JSON.stringify(prevProps.primaryKeyValues) === JSON.stringify(nextProps.primaryKeyValues);
});

const DynamicEntityForm: React.FC = React.memo(() => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);

    const handleEntityChange = useCallback((entity: EntityKeys | null) => {
        setSelectedEntity(entity);
        setSelectedRecord(null);
    }, []);

    const handleRecordChange = useCallback((record: Record<string, any> | null) => {
        setSelectedRecord(record);
    }, []);

    const renderContent = useMemo(() => {
        if (!selectedEntity) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    Select an entity to view its data
                </div>
            );
        }

        return (
            <EntityFormContainer
                entityKey={selectedEntity}
                primaryKeyValues={selectedRecord}
            />
        );
    }, [selectedEntity, selectedRecord]);

    return (
        <Card className="w-full">
            <PreWiredEntityRecordHeader
                onEntityChange={handleEntityChange}
                onRecordChange={handleRecordChange}
            />
            <CardContent>
                {renderContent}
            </CardContent>
        </Card>
    );
});

// Add display names for better debugging
EntityFormContainer.displayName = 'EntityFormContainer';
DynamicEntityForm.displayName = 'DynamicEntityForm';

export default DynamicEntityForm;
