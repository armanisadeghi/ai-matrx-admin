'use client';

import React from 'react';
import { useEditorContext } from '../../provider/EditorProvider';
import { ArmaniCollapsibleGroup } from '@/components/matrx/matrx-collapsible';
import { MatrxMetricRow, MatrxRecordList } from '@/components/matrx/matrx-record-list';

const EditorAnalyzerView = ({ editorId }: { editorId: string }) => {
    const editorContext = useEditorContext();
    const state = editorContext.getEditorState(editorId);
    const layout = editorContext.getEditorLayout(editorId);

    const statusInfo = React.useMemo(() => ({
        "Editor ID": editorId,
        "Chip Count": state.chipCounter,
        "Has Dragged Chip": !!state.draggedChip,
        "Text Length": state.plainTextContent.length,
        "Color Assignments": state.colorAssignments.size,
        "Total Chips": state.chipData.length,
        "Is Visible": layout?.isVisible ?? false,
        "Position": layout?.position ?? 'unknown',
    }), [
        editorId,
        state.chipCounter,
        state.draggedChip,
        state.plainTextContent.length,
        state.colorAssignments.size,
        state.chipData.length,
        layout
    ]);

    const chipItems = React.useMemo(() => 
        state.chipData.map(chip => ({
            title: chip.label,
            content: (
                <MatrxRecordList
                    records={{ [chip.id]: chip }}
                    fields={[
                        { name: 'id', displayName: 'ID' },
                        { name: 'label', displayName: 'Label' },
                        { name: 'stringValue', displayName: 'Value' },
                        { name: 'color', displayName: 'Color' },
                        { name: 'brokerId', displayName: 'Broker ID' },
                    ]}
                    density="compact"
                    size="xs"
                    showBorders={true}
                />
            )
        }))
    , [state.chipData]);

    const colorItems = React.useMemo(() => 
        Array.from(state.colorAssignments.entries()).map(([chipId, color]) => ({
            title: `Color: ${chipId}`,
            content: (
                <MatrxRecordList
                    records={{ [chipId]: { color } }}
                    fields={[
                        { name: 'color', displayName: 'Color Value' }
                    ]}
                    density="compact"
                    size="xs"
                />
            )
        }))
    , [state.colorAssignments]);

    const items = React.useMemo(() => [
        {
            title: `Editor Status`,
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
        {
            title: "Chips",
            items: chipItems
        },
        {
            title: "Color Assignments",
            items: colorItems
        }
    ], [statusInfo, chipItems, colorItems]);

    return (
        <div className="space-y-1 w-full min-w-0 overflow-hidden">
            <ArmaniCollapsibleGroup
                title={`Editor ${editorId}`}
                items={items}
                collapsibleToChip={true}
                id={`${editorId}-collapsible`}
            />
        </div>
    );
};

export default EditorAnalyzerView;