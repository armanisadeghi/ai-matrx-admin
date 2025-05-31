// app/(authenticated)/tests/forms/entity-form/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PreWiredCardHeader from '@/components/matrx/Entity/EntityCardHeaderSelect';
import ArmaniForm from '@/components/matrx/ArmaniForm/ArmaniForm';
import { useEntity } from '@/lib/redux/entity/hooks/useEntity';
import { EntityKeys } from '@/types/entityTypes';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { MatrxTableLoading } from "@/components/matrx/LoadingComponents";
import { createRecordKey } from '@/lib/redux/entity/utils/stateHelpUtils';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';

const EntityFormContainer = ({ entityKey }: { entityKey: EntityKeys }) => {
    const entity = useEntity(entityKey);
    const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
    const [currentPrimaryKeyValues, setCurrentPrimaryKeyValues] = useState<Record<string, any> | null>(null);

    const matrxRecordId = createRecordKey(entity.entityMetadata.primaryKeyMetadata, currentPrimaryKeyValues);

    const currentRecord = useMemo(() => {
        if (!matrxRecordId) return null;
        return entity.allRecords[matrxRecordId];
    }, [matrxRecordId, entity.allRecords]);

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

    useEffect(() => {
        if (entityKey) {
            entity.fetchQuickReference();
        }
    }, [entityKey, entity]);

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
    }, [currentRecord, entity.loadingState.loading, entity]);

    const quickReferenceOptions = useMemo(() => {
        if (!entity?.quickReference?.quickReferenceRecords) return [];

        return entity.quickReference.quickReferenceRecords.map((record: QuickReferenceRecord) => ({
            value: JSON.stringify(record.primaryKeyValues),
            label: record.displayValue || JSON.stringify(record.primaryKeyValues)
        }));
    }, [entity?.quickReference?.quickReferenceRecords]);

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
            <Select
                value={selectedRecordKey || ''}
                onValueChange={handleRecordSelect}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a record" />
                </SelectTrigger>
                <SelectContent>
                    {quickReferenceOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

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

            {entity.activeRecord && (
                <ArmaniForm {...unifiedLayoutProps} />
            )}
        </div>
    );
};

const DynamicEntityForm: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);

    return (
        <Card className="w-full">
            <PreWiredCardHeader onEntityChange={setSelectedEntity} />
            <CardContent>
                {selectedEntity ? (
                    <EntityFormContainer entityKey={selectedEntity} />
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
