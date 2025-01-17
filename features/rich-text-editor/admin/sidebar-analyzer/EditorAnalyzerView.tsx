'use client';

import React from 'react';
import { ArmaniCollapsibleGroup } from '@/components/matrx/matrx-collapsible';
import { MatrxMetricRow, MatrxRecordList } from '@/components/matrx/matrx-record-list';

const EditorAnalyzerView = ({ 
    editorId,
    state,
    layout 
}: { 
    editorId: string;
    state: any;
    layout: any;
}) => {
    const basicMetrics = React.useMemo(() => ({
        "Editor ID": editorId,
        "Total Chips": state.chipData.length,
        "Content Length": state.plainTextContent.length,
        "Position": layout?.position ?? 'N/A',
        "Is Visible": layout?.isVisible ?? false,
    }), [editorId, state, layout]);

    const contentGroups = React.useMemo(() => [
        {
            title: "Current Content",
            content: (
                <div className="font-mono text-xs whitespace-pre-wrap bg-muted/20 rounded-md p-2">
                    {state.plainTextContent || '(Empty)'}
                </div>
            )
        }
    ], [state.plainTextContent]);

    const chipGroups = React.useMemo(() => 
        state.chipData.map(chip => ({
            title: chip.label || chip.id,
            content: (
                <MatrxRecordList
                    records={{ [chip.id]: chip }}
                    fields={[
                        { name: 'label', displayName: 'Label' },
                        { name: 'stringValue', displayName: 'Value' },
                        { name: 'brokerId', displayName: 'Broker ID' },
                        { name: 'color', displayName: 'Color' },
                    ]}
                    density="compact"
                    size="xs"
                    showBorders={true}
                />
            )
        }))
    , [state.chipData]);

    const editorGroups = React.useMemo(() => [
        {
            title: "Editor Overview",
            content: (
                <MatrxRecordList
                    records={{ info: basicMetrics }}
                    fields={Object.keys(basicMetrics).map(key => ({
                        name: key,
                        displayName: key
                    }))}
                    density="compact"
                    size="xs"
                    showBorders={false}
                />
            )
        },
        {
            title: "Editor State",
            content: (
                <MatrxRecordList
                    records={{ state }}
                    fields={[
                        { name: 'chipCounter', displayName: 'Chip Counter' },
                    ]}
                    density="compact"
                    size="xs"
                    showBorders={true}
                />
            )
        },
        {
            title: "Layout",
            content: (
                <MatrxRecordList
                    records={{ layout }}
                    fields={[
                        { name: 'position', displayName: 'Position' },
                        { name: 'isVisible', displayName: 'Visible' },
                        { name: 'type', displayName: 'Type' },
                    ]}
                    density="compact"
                    size="xs"
                    showBorders={true}
                />
            )
        }
    ], [state, layout, basicMetrics]);

    return (
        <div className="space-y-2 w-full min-w-0 overflow-hidden">
            <ArmaniCollapsibleGroup
                title="Content"
                items={contentGroups}
                collapsibleToChip={true}
                id={`editor-content-${editorId}`}
            />

            {state.chipData.length > 0 && (
                <ArmaniCollapsibleGroup
                    title="Chips"
                    items={chipGroups}
                    collapsibleToChip={true}
                    id={`editor-chips-${editorId}`}
                />
            )}
            
            <ArmaniCollapsibleGroup
                title="Editor Info"
                items={editorGroups}
                collapsibleToChip={true}
                id={`editor-info-${editorId}`}
            />
        </div>
    );
};

export default EditorAnalyzerView;