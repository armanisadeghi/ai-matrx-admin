"use client";

import React from "react";
import FullScreenOverlay, { TabDefinition } from '@/components/official/FullScreenOverlay';
import { Edge } from '@xyflow/react';

interface EdgeSettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    edge: Edge | null;
}

export const EdgeSettingsOverlay: React.FC<EdgeSettingsOverlayProps> = ({
    isOpen,
    onClose,
    edge
}) => {
    if (!edge) return null;

    // Define tab content
    const tabs: TabDefinition[] = [
        {
            id: 'basic-info',
            label: 'Basic Info',
            content: (
                <div className="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            Edge Information
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Basic edge properties and connection details
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Edge ID</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <code className="text-sm text-gray-700 dark:text-gray-300">{edge.id}</code>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Edge Type</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <code className="text-sm text-gray-700 dark:text-gray-300">{edge.type || 'default'}</code>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Source Node</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <code className="text-sm text-gray-700 dark:text-gray-300">{edge.source}</code>
                                    {edge.sourceHandle && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Handle: {edge.sourceHandle}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Target Node</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <code className="text-sm text-gray-700 dark:text-gray-300">{edge.target}</code>
                                    {edge.targetHandle && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Handle: {edge.targetHandle}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h4>
                            <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded text-sm font-medium ${
                                    edge.selected 
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                    {edge.selected ? 'Selected' : 'Not Selected'}
                                </span>
                                <span className={`px-2 py-1 rounded text-sm font-medium ${
                                    edge.animated 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                    {edge.animated ? 'Animated' : 'Static'}
                                </span>
                                {edge.hidden && (
                                    <span className="px-2 py-1 rounded text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        Hidden
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'edge-data',
            label: 'Edge Data',
            content: (
                <div className="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            Custom Edge Data
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Custom data attached to this edge
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-full">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {edge.data ? JSON.stringify(edge.data, null, 2) : 'No custom data'}
                        </pre>
                    </div>
                </div>
            )
        },
        {
            id: 'styling',
            label: 'Styling',
            content: (
                <div className="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            Edge Styling
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Style properties, classes, and visual settings
                        </p>
                    </div>
                    <div className="space-y-4">
                        {edge.style && (
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Inline Styles</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {JSON.stringify(edge.style, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                        
                        {edge.className && (
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">CSS Classes</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <code className="text-sm text-gray-700 dark:text-gray-300">{edge.className}</code>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {edge.markerStart && (
                                <div>
                                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Start Marker</h4>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                        <code className="text-sm text-gray-700 dark:text-gray-300">
                                            {typeof edge.markerStart === 'string' ? edge.markerStart : JSON.stringify(edge.markerStart)}
                                        </code>
                                    </div>
                                </div>
                            )}
                            
                            {edge.markerEnd && (
                                <div>
                                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">End Marker</h4>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                        <code className="text-sm text-gray-700 dark:text-gray-300">
                                            {typeof edge.markerEnd === 'string' ? edge.markerEnd : JSON.stringify(edge.markerEnd)}
                                        </code>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'labels',
            label: 'Labels',
            content: (
                <div className="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            Edge Labels
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Label content and styling properties
                        </p>
                    </div>
                    <div className="space-y-4">
                        {edge.label && (
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Label Content</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <code className="text-sm text-gray-700 dark:text-gray-300">
                                        {typeof edge.label === 'string' ? edge.label : 'React Component'}
                                    </code>
                                </div>
                            </div>
                        )}
                        
                        {edge.labelStyle && (
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Label Style</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {JSON.stringify(edge.labelStyle, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Label Background</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                                        edge.labelShowBg 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                    }`}>
                                        {edge.labelShowBg ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                            
                            {edge.labelBgBorderRadius && (
                                <div>
                                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Border Radius</h4>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                        <code className="text-sm text-gray-700 dark:text-gray-300">{edge.labelBgBorderRadius}px</code>
                                    </div>
                                </div>
                            )}
                        </div>

                        {edge.labelBgStyle && (
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Label Background Style</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {JSON.stringify(edge.labelBgStyle, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {edge.labelBgPadding && (
                            <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Label Background Padding</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <code className="text-sm text-gray-700 dark:text-gray-300">[{edge.labelBgPadding.join(', ')}]</code>
                                </div>
                            </div>
                        )}

                        {!edge.label && !edge.labelStyle && !edge.labelShowBg && (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                No label properties configured
                            </div>
                        )}
                    </div>
                </div>
            )
        },
        {
            id: 'complete-edge',
            label: 'Complete Edge Object',
            content: (
                <div className="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            Complete Edge Data
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Full edge object with all properties and data
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-full">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(edge, null, 2)}
                        </pre>
                    </div>
                </div>
            )
        }
    ];

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title="Edge Settings"
            description={`Settings and data for edge: ${edge.id}`}
            tabs={tabs}
            initialTab="basic-info"
            onTabChange={(tab) => console.log('Edge settings tab changed:', tab)}
            showCancelButton={true}
            onCancel={onClose}
            cancelButtonLabel="Close"
            width="90vw"
            height="90vh"
        />
    );
}; 