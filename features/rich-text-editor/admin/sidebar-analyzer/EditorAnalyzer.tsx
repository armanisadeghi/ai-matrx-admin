'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { CardContent } from '@/components/ui/card';
import { MatrxJsonToCollapsible } from "@/components/matrx/matrx-collapsible";
import dynamic from 'next/dynamic';
import EditorAnalyzerView from './EditorAnalyzerView';
import { useEditorContext } from '../../provider/EditorProvider';

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

const EditorAnalyzer: React.FC<EditorAnalyzerProps> = ({
    className = '',
    defaultExpanded = false,
}) => {
    const context = useEditorContext();
    const [registeredEditors, setRegisteredEditors] = useState<string[]>([]);
    const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

    // Log the entire context when component mounts
    useEffect(() => {
        console.log('EditorContext on mount:', {
            context,
            methods: Object.keys(context),
            visibleEditors: context.getVisibleEditors?.() || [],
        });
    }, [context]);

    // Enhanced editor detection
    useEffect(() => {
        const findRegisteredEditors = () => {
            // Try multiple methods to find editors
            const visibleEditors = context.getVisibleEditors?.() || [];
            const editorsByPosition = context.getEditorsByPosition?.() || [];
            
            // Get editors from layout info
            const layoutEditors = editorsByPosition.map(e => e.id);
            
            // Combine all found editors and remove duplicates
            const allEditors = [...new Set([...visibleEditors, ...layoutEditors])];
            
            // Update debug info
            setDebugInfo(`Found ${allEditors.length} editors:\n` +
                `Visible: ${visibleEditors.join(', ')}\n` +
                `Positioned: ${layoutEditors.join(', ')}`
            );
            
            return allEditors;
        };

        const interval = setInterval(() => {
            const editors = findRegisteredEditors();
            
            // Log every check
            console.log('Editor check:', {
                timestamp: new Date().toISOString(),
                foundEditors: editors,
                contextMethods: Object.keys(context),
                hasVisibleEditors: typeof context.getVisibleEditors === 'function',
                hasEditorsByPosition: typeof context.getEditorsByPosition === 'function'
            });

            if (editors.length > 0) {
                setRegisteredEditors(editors);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [context]);

    // Debug display for development
    const debugDisplay = (
        <div className="p-4 text-sm font-mono bg-muted/20 rounded-md">
            <div>Debug Info:</div>
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
        </div>
    );

    if (registeredEditors.length === 0) {
        return (
            <div className="p-4 space-y-4">
                <div className="text-muted-foreground">
                    No registered editors found (Scanning for editors...)
                </div>
                {debugDisplay}
            </div>
        );
    }

    return (
        <div className="space-y-4 scrollbar-none">
            {debugDisplay}
            <CardContent className="p-4 pt-0">
                {registeredEditors.map(editorId => (
                    <EditorAnalyzerView 
                        key={editorId} 
                        editorId={editorId} 
                    />
                ))}

                <p className="text-md text-primary pl-2 mt-4">
                    Raw Editor States ({registeredEditors.length} editors)
                </p>

                {registeredEditors.map((editorId) => {
                    const data = {
                        state: context.getEditorState(editorId),
                        layout: context.getEditorLayout(editorId),
                        isRegistered: context.isEditorRegistered(editorId)
                    };
                    
                    return (
                        <MatrxJsonToCollapsible
                            key={`editor-${editorId}`}
                            title={`Editor ${editorId} State`}
                            data={data}
                            level={0}
                        />
                    );
                })}

                <Suspense fallback={<LoadingState />}>
                    <EnhancedJsonViewerGroup
                        viewers={registeredEditors.map(editorId => ({
                            id: `editor-${editorId}`,
                            title: `Editor ${editorId} State`,
                            data: {
                                state: context.getEditorState(editorId),
                                layout: context.getEditorLayout(editorId),
                                isRegistered: context.isEditorRegistered(editorId)
                            }
                        }))}
                        layout="autoGrid"
                        minimizedPosition="top"
                        className="min-h-0"
                        gridMinWidth="250px"
                    />
                </Suspense>
            </CardContent>
        </div>
    );
};

export default EditorAnalyzer;