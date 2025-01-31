'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { MatrxJsonToCollapsible } from "@/components/matrx/matrx-collapsible";
import dynamic from 'next/dynamic';
import EditorAnalyzerView from './EditorAnalyzerView';
import { useEditorContext } from '@/providers/rich-text-editor/Provider';

const EnhancedJsonViewerGroup = dynamic(() => 
    import('@/components/ui/JsonComponents/JsonViewerComponent').then(mod => mod.EnhancedJsonViewerGroup), 
    { ssr: false }
);

const LoadingState = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-32 bg-muted rounded"></div>
    </div>
);

interface EditorAnalyzerProps {
    className?: string;
    defaultExpanded?: boolean;
}

const EditorAnalyzer: React.FC<EditorAnalyzerProps> = () => {
    const context = useEditorContext();
    const [editorIds, setEditorIds] = useState<string[]>([]);
    const [selectedEditor, setSelectedEditor] = useState<string | null>(null);

    useEffect(() => {
        const updateEditors = () => {
            const allStates = context.getAllEditorStates();
            const currentEditors = Object.keys(allStates).sort();
            setEditorIds(currentEditors);
        };

        updateEditors();
        const interval = setInterval(updateEditors, 1000);
        return () => clearInterval(interval);
    }, [context]);

    const getEditorSections = (editorId: string) => [
        {
            id: `${editorId}-state`,
            title: 'Editor State',
            data: context.getEditorState(editorId)
        },
        {
            id: `${editorId}-layout`,
            title: 'Layout Data',
            data: context.layout.getEditorLayout(editorId)
        },
        {
            id: `${editorId}-chips`,
            title: 'Chip Data',
            data: context.getEditorState(editorId).chipData
        }
    ];

    if (editorIds.length === 0) {
        return (
            <div className="p-2">
                <div className="text-muted-foreground text-sm">No editors found</div>
            </div>
        );
    }

    return (
        <div className="space-y-2 scrollbar-none">
            {selectedEditor ? (
                <>
                    <div className="flex items-center border-b border-border pb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEditor(null)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1"/>
                            <span className="text-sm font-medium">{selectedEditor}</span>
                        </Button>
                    </div>
                    <CardContent className="p-2">
                        <EditorAnalyzerView 
                            editorId={selectedEditor}
                            state={context.getEditorState(selectedEditor)}
                            layout={context.layout.getEditorLayout(selectedEditor)}
                        />

                        <div className="mt-4">
                            {getEditorSections(selectedEditor).map((section) => (
                                <MatrxJsonToCollapsible
                                    key={section.id}
                                    title={section.title}
                                    data={section.data}
                                    level={0}
                                />
                            ))}

                            <Suspense fallback={<LoadingState />}>
                                <EnhancedJsonViewerGroup
                                    viewers={getEditorSections(selectedEditor)}
                                    layout="autoGrid"
                                    minimizedPosition="top"
                                    className="min-h-0"
                                    gridMinWidth="250px"
                                />
                            </Suspense>
                        </div>
                    </CardContent>
                </>
            ) : (
                <CardContent className="p-2">
                    <div className="flex gap-2 flex-wrap">
                        {editorIds.map((editorId) => (
                            <Button
                                key={editorId}
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedEditor(editorId)}
                                className="text-sm"
                            >
                                {editorId}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            )}
        </div>
    );
};

export default EditorAnalyzer;