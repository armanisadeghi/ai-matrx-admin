import React, { useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { Button, Card } from '@/components/ui';
import { Plus } from 'lucide-react';
import { AdjustableEditorPanel } from './AdjustablePanel';
import { EditorWithProviders } from '@/features/rich-text-editor/withManagedEditor';

interface PanelManagerProps {
    role?: 'system' | 'user' | 'assistant';
}

type Section = {
    id: string;
    role: 'system' | 'user' | 'assistant';
};

export function PanelManager({ role }: PanelManagerProps) {
    const [sections, setSections] = useState<Section[]>([{ id: 'system-1', role: 'system' }]);

    const addSection = () => {
        const nextRole = sections.length % 2 === 1 ? 'user' : 'assistant';
        const roleCount = sections.filter((s) => s.role === nextRole).length + 1;
        const newId = `${nextRole}-${roleCount}`;

        setSections([
            ...sections,
            {
                id: newId,
                role: nextRole,
            },
        ]);
    };

    const getButtonText = () => {
        return `Add ${sections.length % 2 === 1 ? 'User' : 'Assistant'} Message`;
    };

    return (
        <Panel defaultSize={55}>
            <PanelGroup
                direction='vertical'
                className='h-full'
            >
                {sections.map((section, index) => (
                    <AdjustableEditorPanel
                        key={section.id}
                        id={section.id}
                        order={index + 1}
                        role={section.role}
                        initialContent=''
                    />
                ))}

                {/* Bottom flexible panel */}
                <Panel
                    defaultSize={85}
                    minSize={10}
                    maxSize={100}
                    order={999}
                >
                    <Card className='h-full p-1 overflow-hidden bg-background'>
                        <EditorWithProviders
                            id='bottom-section'
                            className='w-full h-full border border-gray-300 dark:border-gray-700 rounded-md'
                            initialContent=''
                        />
                    </Card>
                </Panel>

                <Button
                    variant='ghost'
                    className='w-full mt-2'
                    onClick={addSection}
                >
                    <Plus className='h-4 w-4 mr-2' />
                    {getButtonText()}
                </Button>
            </PanelGroup>
        </Panel>
    );
}
