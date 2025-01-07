import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, AlertCircle } from 'lucide-react';

interface DebugSnapshot {
    timestamp: string;
    operation: string;
    html: string;
    selection: {
        start: number;
        end: number;
        collapsed: boolean;
    } | null;
    error?: {
        message: string;
        stack: string;
    };
    context?: Record<string, any>;
}

interface EditorDebugPanelProps {
    snapshots: DebugSnapshot[];
    onClearSnapshots: () => void;
}

const EditorDebugPanel: React.FC<EditorDebugPanelProps> = ({ snapshots, onClearSnapshots }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null);

    const hasErrors = snapshots.some(snapshot => snapshot.error);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    return (
        <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    <h3 className="font-medium">Editor Debug Panel</h3>
                    {hasErrors && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onClearSnapshots}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronUp className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="max-h-96 overflow-auto">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {snapshots.map((snapshot, index) => (
                            <div key={index} className="p-3">
                                <div
                                    className={`flex items-center justify-between cursor-pointer ${
                                        snapshot.error ? 'text-red-500' : ''
                                    }`}
                                    onClick={() => setSelectedSnapshot(selectedSnapshot === index ? null : index)}
                                >
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium">{snapshot.operation}</span>
                                        <span className="text-xs text-gray-500">
                                            {formatTimestamp(snapshot.timestamp)}
                                        </span>
                                    </div>
                                    {snapshot.error && (
                                        <AlertCircle className="w-4 h-4" />
                                    )}
                                </div>

                                {selectedSnapshot === index && (
                                    <div className="mt-2 space-y-2">
                                        {snapshot.error && (
                                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                                    {snapshot.error.message}
                                                </p>
                                                <pre className="mt-1 text-xs text-red-600 dark:text-red-400 overflow-auto">
                                                    {snapshot.error.stack}
                                                </pre>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                HTML Structure
                                            </p>
                                            <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-auto max-h-40">
                                                {snapshot.html}
                                            </pre>
                                        </div>
                                        {snapshot.selection && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    Selection State
                                                </p>
                                                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                                    {JSON.stringify(snapshot.selection, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        {snapshot.context && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    Context
                                                </p>
                                                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                                    {JSON.stringify(snapshot.context, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditorDebugPanel;