'use client';

import React, {useState, useCallback, useMemo} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {useEntity} from '@/lib/redux/entity/hooks/useEntity';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {
    FormFieldType
} from '@/components/matrx/Entity/types/entityForm';
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import PreWiredEntityRecordHeader from '@/components/matrx/Entity/records/PreWiredEntityRecordHeader';
import {EntityError, EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {mapFieldDataTypeToFormFieldType} from "@/components/matrx/Entity/addOns/mapDataTypeToFormFieldType";
import ArmaniForm from '@/components/matrx/ArmaniForm/ArmaniForm';
import {ArmaniFormProps, EntityFormState} from "@/types/componentConfigTypes";
import {useDynamicMeasurements} from "@/hooks/ui/useDynamicMeasurements";
import {cn} from "@/lib/utils";
import {ScrollArea} from '@/components/ui';

// Memoized Configurations
const DEFAULT_FORM_CONFIG = {
    layout: 'grid' as const,
    direction: 'row' as const,
    enableSearch: false,
    columns: 2,
    isSinglePage: true,
    isFullPage: true
};

interface EntityContentProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

function EntityContent<TEntity extends EntityKeys>({entityKey}: EntityContentProps<TEntity>) {
    const entity = useEntity(entityKey);
    const [formData, setFormData] = useState<EntityData<EntityKeys>>({});

    const getMatrxRecordId = useCallback(() => {
        if (!entity.activeRecord || !entity.primaryKeyMetadata) return null;

        return entity.matrxRecordIdByPrimaryKey(
            entity.primaryKeyMetadata.fields.reduce(
                (acc, field) => ({
                    ...acc,
                    [field]: entity.activeRecord[field],
                }),
                {} as Record<string, MatrxRecordId>
            )
        );
    }, [entity.primaryKeyMetadata, entity]);

    // Memoize field update handler
    const handleFieldUpdate = useCallback((fieldName: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    }, []);

    // Memoize CRUD handlers
    const handleUpdate = useCallback((data: EntityData<EntityKeys>) => {
        const matrxRecordId = getMatrxRecordId();
        if (!matrxRecordId) return;

        entity.updateRecord(
            matrxRecordId,
            data,
            {showToast: true}
        );
    }, [entity, getMatrxRecordId]);

    const handleCreate = useCallback((data: EntityData<EntityKeys>) => {
        entity.createRecord(
            data,
            {showToast: true}
        );
    }, [entity]);

    const handleDelete = useCallback(() => {
        const matrxRecordId = getMatrxRecordId();
        if (!matrxRecordId) return;

        entity.deleteRecord(
            matrxRecordId,
            {showToast: true}
        );
    }, [entity, getMatrxRecordId]);

    // Sync form data with active record
    React.useEffect(() => {
        if (entity.activeRecord) {
            setFormData(entity.activeRecord);
        }
    }, [entity.activeRecord]);


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


    const formProps: ArmaniFormProps = useMemo(() => ({
        entityKey: entityKey,
        dynamicFieldInfo: entity.fieldInfo,
        formData: formData,
        onUpdateField: handleFieldUpdate,
        onSubmit: handleSubmit,
        layout: 'grid' as const,
        direction: 'row' as const,
        enableSearch: false,
        columns: 2,
        isSinglePage: true,
        isFullPage: true,
        density: 'normal' as const,
        animationPreset: 'subtle' as const,
        size: 'default' as const,
        variant: 'default' as const,
        floatingLabel: true,
        className: ''
    }), [formData, handleFieldUpdate, handleSubmit, entityKey, entity.fieldInfo]);

    if (!entity.entityMetadata) {
        return <MatrxTableLoading/>;
    }

    if (entity.loadingState.error) {
        return (
            <div className="p-4 text-red-500">
                Error: {entity.loadingState.error.message}
            </div>
        );
    }

    const {
        measurements,
        getRef
    } = useDynamicMeasurements({
        buffer: 8,
        debounceMs: 300,
        threshold: 10,
        initialPauseMs: 800,
    });

    const containerRef = getRef('container');

    const getAdjustedHeight = () => {
        const height = measurements.container?.availableHeight || 0;
        return Math.max(0, height - 24);
    };

    return (
        <div
            className={cn("h-full overflow-hidden")}
            ref={containerRef}
        >
            <ScrollArea
                className="h-full"
                style={{height: `${getAdjustedHeight()}px`}}
            >
                {entity.activeRecord && (
                    <ArmaniForm{...formProps} />
                )}
            </ScrollArea>
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
