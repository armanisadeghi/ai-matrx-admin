import React, { useState, useEffect, useCallback } from 'react';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import { MatrxRecordId } from '@/types';
import { EditorLineInfo, getEditorLineInfo } from '@/features/rich-text-editor/utils/new-test-util';
import CompactTable from '@/components/matrx/CompactTable';
import { findAllChipPatterns } from '@/features/rich-text-editor/utils/setEditorUtils';

interface DebugPanelProps {
    editorId: MatrxRecordId;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ editorId }) => {
    const [activeView, setActiveView] = useState<'editor' | 'text' | 'chips' | 'patterns'>('editor');
    const [editorInfo, setEditorInfo] = useState<EditorLineInfo>({} as EditorLineInfo);
    const [patternMatches, setPatternMatches] = useState<any[]>([]);
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);

    const refreshEditorInfo = useCallback(() => {
        const info = getEditorLineInfo(editorId);
        setEditorInfo(info);
    }, [editorId]);

    const refreshPatternMatches = useCallback(() => {
        const matches = findAllChipPatterns(editorState.plainTextContent || '');
        setPatternMatches(matches);
    }, [editorState.plainTextContent]);

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

    const tabs = [
        { 
            id: 'editor', 
            label: 'Editor Info',
            onMouseEnter: refreshEditorInfo
        },
        { 
            id: 'text', 
            label: 'Text Content'
        },
        { 
            id: 'chips', 
            label: 'Chip Data'
        },
        {
            id: 'patterns',
            label: 'Chip Patterns',
            onMouseEnter: refreshPatternMatches
        }
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
            case 'text':
                return (
                    <div className='w-full'>
                        <div className='text-xs font-medium mb-1'>Plain Text Content:</div>
                        <div className='text-xs font-mono bg-muted/30 p-2 rounded'>
                            {editorState.plainTextContent || 'No content'}
                        </div>
                    </div>
                );
            case 'chips':
                return (
                    <div className='w-full'>
                        <div className='text-xs font-medium mb-1'>Chips:</div>
                        <div className='flex flex-wrap gap-1'>
                            {editorState.chipData?.map((chip: ChipData) => (
                                <span
                                    key={chip.id}
                                    className='px-2 py-0.5 rounded text-xs inline-flex items-center'
                                    style={{ backgroundColor: chip.color || '#e2e8f0' }}
                                >
                                    {chip.label}
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