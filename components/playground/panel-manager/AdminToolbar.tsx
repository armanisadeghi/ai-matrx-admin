import React, { useState, useEffect, useCallback } from 'react';
import { BrokerMetaData, ChipData, EditorState } from '@/features/rich-text-editor/types/editor.types';
import { MatrxRecordId } from '@/types';
import { EditorLineInfo, getEditorLineInfo } from '@/features/rich-text-editor/utils/new-test-util';
import CompactTable from '@/components/matrx/CompactTable';

import { useEditorContext } from '@/features/rich-text-editor/provider/provider';
import { getProcessedMetadataFromText } from '@/features/rich-text-editor/utils/patternUtils';

interface DebugPanelProps {
    editorId: MatrxRecordId;
    message: any;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ editorId, message }) => {
    const [activeView, setActiveView] = useState<'editor' | 'text' | 'editorState' | 'chips' | 'patterns' | 'brokers' | 'message'>('editor');
    const [editorInfo, setEditorInfo] = useState<EditorLineInfo>({} as EditorLineInfo);
    const [patternMatches, setPatternMatches] = useState<any[]>([]);
    const [brokerMetaData, setBrokerMetaData] = useState<BrokerMetaData[]>([]);
    const [editorState, setEditorState] = useState<EditorState>({} as EditorState);
    const context = useEditorContext();
    const content = context.getContent(editorId);

    const refreshEditorInfo = useCallback(() => {
        const info = getEditorLineInfo(editorId);
        setEditorInfo(info);
    }, [editorId]);

    const refreshPatternMatches = useCallback(() => {
        const matches = getProcessedMetadataFromText(content || '');
        setPatternMatches(matches);
    }, [content]);

    const refreshBrokerMetaData = useCallback(() => {
        const brokers = context.getBrokerMetadata(editorId);
        setBrokerMetaData(brokers || []);
    }, [context, editorId]);

    const refreshEditorState = useCallback(() => {
        const currentState = context.getEditorState(editorId);
        setEditorState(currentState);
    }, [context, editorId]);
    // Set up interval refresh when editor tab is active
    useEffect(() => {
        if (activeView === 'editor') {
            refreshEditorInfo();
            const interval = setInterval(refreshEditorInfo, 2000);
            return () => clearInterval(interval);
        }
    }, [activeView, refreshEditorInfo]);

    // Set up interval refresh when patterns tab is active
    useEffect(() => {
        if (activeView === 'patterns') {
            refreshPatternMatches();
            const interval = setInterval(refreshPatternMatches, 2000);
            return () => clearInterval(interval);
        }
    }, [activeView, refreshPatternMatches]);

    // Refresh broker metadata when brokers tab is active
    useEffect(() => {
        if (activeView === 'brokers') {
            refreshBrokerMetaData();
        }
    }, [activeView, refreshBrokerMetaData]);

    useEffect(() => {
        if (activeView === 'editorState') {
            refreshBrokerMetaData();
        }
    }, [activeView, refreshBrokerMetaData]);

    const tabs = [
        { id: 'editor', label: 'Editor Info', onMouseEnter: refreshEditorInfo },
        { id: 'text', label: 'Text Content' },
        { id: 'editorState', label: 'Editor State', onMouseEnter: refreshEditorState },
        { id: 'chips', label: 'Chip Data' },
        { id: 'patterns', label: 'Chip Patterns', onMouseEnter: refreshPatternMatches },
        { id: 'brokers', label: 'Broker Data', onMouseEnter: refreshBrokerMetaData },
        { id: 'message', label: 'Message Data' },
    ];
    const renderDebugContent = () => {
        switch (activeView) {
            case 'editor':
                return (
                    <CompactTable
                        data={editorInfo}
                        columns={8}
                    />
                );
            case 'editorState':
                return (
                    <CompactTable
                        data={editorState}
                        columns={5}
                    />
                );

            case 'text':
                return (
                    <div className='w-full'>
                        <div className='text-xs font-medium mb-1'>Plain Text Content:</div>
                        <div className='text-xs font-mono bg-muted/30 p-2 rounded'>{content || 'No content'}</div>
                    </div>
                );
            case 'chips':
                return (
                    <div className='w-full'>
                        <div className='text-xs font-medium mb-1'>Chips:</div>
                        <div className='flex flex-wrap gap-1'>
                            {brokerMetaData?.map((broker: BrokerMetaData) => (
                                <span
                                    key={broker.id}
                                    className='px-2 py-0.5 rounded text-xs inline-flex items-center'
                                    style={{ backgroundColor: broker.color || '#e2e8f0' }}
                                >
                                    {broker.name}
                                    {broker.status === 'disconnected' && <span className='ml-1 text-red-500'>[disconnected]</span>}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            case 'patterns':
                return (
                    <CompactTable
                        data={patternMatches}
                        columns={4}
                    />
                );
            case 'brokers':
                return (
                    <CompactTable
                        data={brokerMetaData}
                        columns={8}
                    />
                );
            case 'message':
                return (
                    <CompactTable
                        data={[
                            {
                                id: message.id,
                                matrxRecordId: message.matrxRecordId,
                                order: message.order,
                                recipeId: message.recipeId,
                                parentMatrxId: message.parentMatrxId,
                                role: message.role,
                                type: message.type,
                                content: message.content,
                            },
                        ]}
                    />
                );
        }
    };

    return (
        <div className='bg-background border-b'>
            <div className='flex border-b'>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id as any)}
                        onMouseEnter={tab.onMouseEnter}
                        className={`
                            px-3 py-1 text-xs font-medium transition-colors
                            ${activeView === tab.id ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className='p-2'>{renderDebugContent()}</div>
        </div>
    );
};

export default DebugPanel;
