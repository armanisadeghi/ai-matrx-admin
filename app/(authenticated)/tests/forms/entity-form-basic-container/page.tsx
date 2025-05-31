'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useEntity } from '@/lib/redux/entity/hooks/useEntity';
import { EntityKeys } from '@/types/entityTypes';
import { MatrxTableLoading } from "@/components/matrx/LoadingComponents";
import PreWiredEntityRecordHeader from '@/components/matrx/Entity/records/PreWiredEntityRecordHeaderBasic';
import ArmaniForm from '@/components/matrx/ArmaniForm/ArmaniForm';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';

const EntityFormContainer = React.memo((
    {
        entityKey,
        primaryKeyValues
    }: {
        entityKey: EntityKeys;
        primaryKeyValues: Record<string, any> | null;
    }) => {
    const entity = useEntity(entityKey);

    const matrxRecordId = useMemo(() => {
        return primaryKeyValues ? entity.matrxRecordIdByPrimaryKey(primaryKeyValues) : null;
    }, [primaryKeyValues, entity]);

    // Create unified layout props for the form
    const baseUnifiedProps = getUnifiedLayoutProps({
        entityKey,
        density: 'normal',
        formComponent: 'DEFAULT'
    });

    const unifiedLayoutProps: UnifiedLayoutProps = getUpdatedUnifiedLayoutProps(baseUnifiedProps, {
        dynamicStyleOptions: {
            density: 'normal',
            animationPreset: 'subtle',
            size: 'default',
            variant: 'default'
        },
        dynamicLayoutOptions: {
            formStyleOptions: {
                formLayout: 'grid',
                formColumns: 2,
                formDirection: 'row',
                formEnableSearch: false,
                formIsSinglePage: true,
                formIsFullPage: true,
                floatingLabel: true
            }
        }
    });

    // Effects for record loading and selection
    React.useEffect(() => {
        if (primaryKeyValues) {
            entity.fetchOne(matrxRecordId);
        }
    }, [primaryKeyValues, entity, matrxRecordId]);

    React.useEffect(() => {
        if (matrxRecordId && !entity.loadingState.loading) {
            entity.handleSingleSelection(matrxRecordId);
        }
    }, [matrxRecordId, entity]);

    if (!entity.entityMetadata) {
        return <MatrxTableLoading />;
    }

    if (entity.loadingState.error) {
        return (
            <div className="p-4 text-red-500 dark:text-red-400">
                Error: {entity.loadingState.error.message}
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            <SmartCrudButtons
                entityKey={entityKey}
                options={{
                    allowCreate: true,
                    allowEdit: true,
                    allowDelete: true,
                }}
                layout={{
                    buttonLayout: 'row',
                    buttonSize: 'sm',
                }}
            />
            
            {(entity.activeRecord || !primaryKeyValues) && (
                <ArmaniForm {...unifiedLayoutProps} />
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
