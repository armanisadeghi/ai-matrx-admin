import { useState } from "react";
import { WorkflowData } from "../../types";

interface RawDataSectionProps {
    workflow: WorkflowData;
}

export function RawDataSection({ workflow }: RawDataSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Calculate some stats about the raw data
    const jsonString = JSON.stringify(workflow, null, 2);
    const lineCount = jsonString.split('\n').length;
    const charCount = jsonString.length;
    const sizeInKB = (charCount / 1024).toFixed(1);

    return (
        <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 hover:shadow-md transition-all duration-200">
            {/* Clickable Header */}
            <div 
                className="p-4 cursor-pointer select-none"
                onClick={toggleExpanded}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-500 dark:bg-slate-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            💾
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                Raw Data
                            </h3>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                {lineCount} lines • {sizeInKB} KB
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            JSON
                        </div>
                        <div className={`transition-transform duration-200 text-slate-600 dark:text-slate-400 ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="px-4 pb-4">
                    {/* Data Stats */}
                    <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{lineCount}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">Lines</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{charCount.toLocaleString()}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">Characters</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{sizeInKB}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">KB</div>
                        </div>
                    </div>

                    {/* JSON Content */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                        <div className="p-3 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Complete Workflow Data
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(jsonString);
                                    }}
                                    className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                        <div className="max-h-96 overflow-auto">
                            <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-4 whitespace-pre-wrap break-words font-mono leading-relaxed">
                                {jsonString}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 