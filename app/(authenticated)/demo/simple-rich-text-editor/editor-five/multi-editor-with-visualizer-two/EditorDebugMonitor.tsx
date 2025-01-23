'use client';

import React, { useState, useEffect, useRef } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEditorContext } from '@/features/rich-text-editor/provider/new/EditorProvider';

interface EditorDebugState {
    isRegistered: boolean;
    hasState: boolean;
    hasLayout: boolean;
    isFunctional: boolean;
    state: any;
    layout: any;
    lastStateUpdate: string;
    lastRegistrationChange: string;
}

const EditorDebugMonitor = () => {
    const context = useEditorContext();
    const [editorStates, setEditorStates] = useState<Record<string, EditorDebugState>>({});
    const [rawContextData, setRawContextData] = useState<any>({});
    const activeEditorsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const updateData = () => {
            // Update processed states
            const newStates: Record<string, EditorDebugState> = {};
            const currentTimestamp = new Date().toISOString();
            
            const allStates = context.getAllEditorStates();
            
            Object.entries(allStates).forEach(([id, state]) => {
                activeEditorsRef.current.add(id);
            });

            activeEditorsRef.current.forEach(id => {
                const state = context.getEditorState(id);
                const layout = context.getEditorLayout(id);
                const isRegistered = context.isEditorRegistered(id);
                const hasState = Boolean(state && Object.keys(state).length > 0);
                const hasLayout = Boolean(layout);
                const isFunctional = hasState || hasLayout;

                const previousState = editorStates[id];
                const stateChanged = JSON.stringify(state) !== JSON.stringify(previousState?.state);
                const registrationChanged = isRegistered !== previousState?.isRegistered;

                newStates[id] = {
                    isRegistered,
                    hasState,
                    hasLayout,
                    isFunctional,
                    state,
                    layout,
                    lastStateUpdate: stateChanged ? currentTimestamp : (previousState?.lastStateUpdate || currentTimestamp),
                    lastRegistrationChange: registrationChanged ? currentTimestamp : (previousState?.lastRegistrationChange || currentTimestamp)
                };
            });

            // Capture raw context data
            const raw = {
                allEditorStates: context.getAllEditorStates(),
                visibleEditors: context.getVisibleEditors(),
                editorsByPosition: context.getEditorsByPosition(),
                rawRegistrationStatus: Array.from(activeEditorsRef.current).reduce((acc, id) => ({
                    ...acc,
                    [id]: context.isEditorRegistered(id)
                }), {}),
                timestamp: new Date().toISOString()
            };

            setEditorStates(newStates);
            setRawContextData(raw);
        };

        updateData();
        const interval = setInterval(updateData, 500);
        return () => clearInterval(interval);
    }, [context]);

    const activeEditors = Array.from(activeEditorsRef.current).sort();

    const ProcessedView = () => (
        <div className="space-y-2">
            <div className="bg-secondary/20 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Editor Debug Monitor</h3>
                <div className="grid grid-cols-2 gap-2">
                    <div>Active Editors: {activeEditors.length}</div>
                    <div>Registered Editors: {Object.values(editorStates).filter(s => s.isRegistered).length}</div>
                    <div>Functional Editors: {Object.values(editorStates).filter(s => s.isFunctional).length}</div>
                </div>
            </div>

            <div className="space-y-2">
                {activeEditors.map(id => {
                    const info = editorStates[id];
                    if (!info) return null;

                    return (
                        <div key={id} className="bg-secondary/10 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold">{id}</span>
                                <div className="flex gap-2">
                                    <span className={`px-2 py-0.5 rounded ${
                                        info.isRegistered 
                                            ? 'bg-green-500/20 text-green-700 dark:text-green-300' 
                                            : 'bg-red-500/20 text-red-700 dark:text-red-300'
                                    }`}>
                                        {info.isRegistered ? 'Registered' : 'Unregistered'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded ${
                                        info.isFunctional
                                            ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                            : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                                    }`}>
                                        {info.isFunctional ? 'Functional' : 'Non-functional'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 text-xs mb-2">
                                <div>Has State: {info.hasState ? 'Yes' : 'No'}</div>
                                <div>Has Layout: {info.hasLayout ? 'Yes' : 'No'}</div>
                                <div>Last State Update: {new Date(info.lastStateUpdate).toLocaleTimeString()}</div>
                                <div>Last Registration Change: {new Date(info.lastRegistrationChange).toLocaleTimeString()}</div>
                            </div>

                            {info.hasState && (
                                <div className="mt-2">
                                    <div className="font-bold mb-1">State:</div>
                                    <pre className="bg-muted p-2 rounded overflow-auto max-h-32">
                                        {JSON.stringify(info.state, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {info.hasLayout && (
                                <div className="mt-2">
                                    <div className="font-bold mb-1">Layout:</div>
                                    <pre className="bg-muted p-2 rounded overflow-auto max-h-32">
                                        {JSON.stringify(info.layout, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const RawView = () => (
        <div className="space-y-4">
            <div className="bg-secondary/20 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Raw Context Data</h3>
                <div className="text-xs text-muted-foreground">
                    Last Updated: {new Date(rawContextData.timestamp).toLocaleTimeString()}
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="font-bold mb-1">All Editor States</div>
                    <pre className="bg-muted p-2 rounded overflow-auto max-h-96">
                        {JSON.stringify(rawContextData.allEditorStates, null, 2)}
                    </pre>
                </div>

                <div>
                    <div className="font-bold mb-1">Registration Status</div>
                    <pre className="bg-muted p-2 rounded overflow-auto max-h-96">
                        {JSON.stringify(rawContextData.rawRegistrationStatus, null, 2)}
                    </pre>
                </div>

                <div>
                    <div className="font-bold mb-1">Visible Editors</div>
                    <pre className="bg-muted p-2 rounded overflow-auto max-h-96">
                        {JSON.stringify(rawContextData.visibleEditors, null, 2)}
                    </pre>
                </div>

                <div>
                    <div className="font-bold mb-1">Editors By Position</div>
                    <pre className="bg-muted p-2 rounded overflow-auto max-h-96">
                        {JSON.stringify(rawContextData.editorsByPosition, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );

    return (
        <Tabs defaultValue="processed" className="w-full">
            <TabsList>
                <TabsTrigger value="processed">Processed View</TabsTrigger>
                <TabsTrigger value="raw">Raw Context Data</TabsTrigger>
            </TabsList>
            <TabsContent value="processed">
                <ProcessedView />
            </TabsContent>
            <TabsContent value="raw">
                <RawView />
            </TabsContent>
        </Tabs>
    );
};

export default EditorDebugMonitor;