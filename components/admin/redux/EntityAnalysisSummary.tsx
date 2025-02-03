'use client';

import React from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { useEntityAnalyzer } from "@/lib/redux/entity/hooks/useEntityAnalyzer";
import { ArmaniCollapsibleGroup } from '@/components/matrx/matrx-collapsible';
import { MatrxMetricRow, MatrxRecordList } from '@/components/matrx/matrx-record-list';

const EntityAnalyzerView = ({ entityKey }: { entityKey: EntityKeys }) => {
    const {
        rawEntityState: state,
        getEntityLabel
    } = useEntityAnalyzer(entityKey);

    const entityLabel = React.useMemo(() => getEntityLabel(entityKey), [getEntityLabel, entityKey]);

    if (!state) return null;

    const statusInfo = React.useMemo(() => ({
        "Entity Name": entityLabel,
        "Active Record": state.selection.activeRecord || 'None',
        "Selected Count": state.selection.selectedRecords.length,
        "Quick Ref Count": Object.keys(state.quickReference || {}).length,
        "Total Records": Object.keys(state.records || {}).length,
        "Operation Mode": state.flags.operationMode || 'view',
        "Pending Ops": state.pendingOperations.length,
        "Unsaved Data": !!state.flags.hasUnsavedChanges,
        "Loading": !!state.loading.loading,
        "Initialized": !!state.loading.initialized,
        "Error": state.loading.error?.message || 'None',
        "Last Operation": state.loading.lastOperation || 'None'
    }), [
        entityLabel,
        state.selection.activeRecord,
        state.selection.selectedRecords.length,
        state.quickReference,
        state.records,
        state.flags.operationMode,
        state.flags.hasUnsavedChanges,
        state.pendingOperations.length,
        state.loading.loading,
        state.loading.initialized,
        state.loading.error?.message,
        state.loading.lastOperation
    ]);

    const fields = state.entityMetadata.entityFields

    const activeRecord = React.useMemo(() =>
            state.selection.activeRecord && state.records[state.selection.activeRecord]
            ? { [state.selection.activeRecord]: state.records[state.selection.activeRecord] }
            : null
        , [state.selection.activeRecord, state.records]);

    const unsavedRecord = React.useMemo(() =>
            state.selection.activeRecord && state.unsavedRecords[state.selection.activeRecord]
            ? { [state.selection.activeRecord]: state.unsavedRecords[state.selection.activeRecord] }
            : null
        , [state.selection.activeRecord, state.unsavedRecords]);

    const selectedRecords = React.useMemo(() =>
            state.selection.selectedRecords.reduce((acc, id) => {
                if (state.records[id]) {
                    acc[id] = state.records[id];
                }
                return acc;
            }, {} as Record<string, any>)
        , [state.selection.selectedRecords, state.records]);

    const selectedRecordItems = React.useMemo(() =>
            Object.entries(selectedRecords).map(([id, record]) => ({
                title: record[fields[0]?.name] || id,
                content: (
                    <MatrxRecordList
                        records={{ [id]: record }}
                        fields={fields}
                        density="compact"
                        size="xs"
                        showBorders={true}
                    />
                )
            }))
        , [selectedRecords, fields]);

    const items = React.useMemo(() => [
        {
            title: `${entityLabel} Status`,
            content: (
                <div className="space-y-0.5">
                    {Object.entries(statusInfo).map(([label, value]) => (
                        <MatrxMetricRow
                            key={label}
                            label={label}
                            value={value}
                            showIcon={typeof value === 'boolean'}
                        />
                    ))}
                </div>
            )
        },
        ...(activeRecord ? [{
            title: "Current Record",
            content: (
                <MatrxRecordList
                    records={activeRecord}
                    fields={fields}
                    density="compact"
                    size="xs"
                    showBorders={true}
                />
            )
        }] : []),
        ...(unsavedRecord ? [{
            title: "Unsaved Changes",
            content: (
                <MatrxRecordList
                    records={unsavedRecord}
                    fields={fields}
                    density="comfortable"
                    size="xs"
                    showBorders={true}
                />
            )
        }] : []),
        ...(selectedRecordItems.length > 0 ? [{
            title: "Selected Records",
            items: selectedRecordItems
        }] : [])
    ], [entityLabel, statusInfo, activeRecord, unsavedRecord, selectedRecordItems, fields]);

    return (
        <div className="space-y-1 w-full min-w-0 overflow-hidden">
            <ArmaniCollapsibleGroup
                title={entityLabel}
                items={items}
                collapsibleToChip={true}
                id={`${entityKey}-collapsible`}
            />
        </div>
    );
};

export default EntityAnalyzerView;
