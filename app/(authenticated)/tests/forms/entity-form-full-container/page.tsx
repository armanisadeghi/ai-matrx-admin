'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useEntity } from '@/lib/redux/entity/hooks/useEntity';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { MatrxTableLoading } from "@/components/matrx/LoadingComponents";
import PreWiredEntityRecordHeader from '@/components/matrx/Entity/records/PreWiredEntityRecordHeader';
import { EntityError } from '@/lib/redux/entity/types/stateTypes';
import ArmaniForm from '@/components/matrx/ArmaniForm/ArmaniForm';
import { useDynamicMeasurements } from "@/hooks/ui/useDynamicMeasurements";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui';
import SmartCrudButtons from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';

interface EntityContentProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

function EntityContent<TEntity extends EntityKeys>({ entityKey }: EntityContentProps<TEntity>) {
    const entity = useEntity(entityKey);

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
        <div className="space-y-4">
            <div
                className={cn("h-full overflow-hidden")}
                ref={containerRef}
            >
                <ScrollArea
                    className="h-full"
                    style={{ height: `${getAdjustedHeight()}px` }}
                >
                    {entity.activeRecord && (
                        <ArmaniForm {...unifiedLayoutProps} />
                    )}
                </ScrollArea>
            </div>
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
                    <div className="text-red-500 dark:text-red-400 mb-4">
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
