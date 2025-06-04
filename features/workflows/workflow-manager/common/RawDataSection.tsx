import { useState } from "react";
import { WorkflowData } from "@/types/customWorkflowTypes";
import { Database, ChevronDown, Copy, BarChart3, FileText, HardDrive } from "lucide-react";

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
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950/20 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            {/* Clickable Header */}
            <div 
                className="p-6 cursor-pointer select-none hover:bg-gradient-to-br hover:from-slate-50/50 hover:to-blue-50/50 dark:hover:from-slate-800/50 dark:hover:to-blue-950/30 transition-all duration-200"
                onClick={toggleExpanded}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-xl flex items-center justify-center shadow-sm">
                                <Database className="w-6 h-6" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                <HardDrive className="w-2 h-2 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                                Raw Workflow Data
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    <span>{lineCount} lines</span>
                                </div>
                                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                                <div className="flex items-center gap-1">
                                    <BarChart3 className="w-4 h-4" />
                                    <span>{sizeInKB} KB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                            JSON
                        </div>
                        <div className={`transition-transform duration-300 text-slate-500 dark:text-slate-400 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? 'opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="px-6 pb-6">
                    {/* Data Stats */}
                    <div className="mb-6 grid grid-cols-3 gap-4">
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-600/50 text-center hover:bg-white dark:hover:bg-slate-800 transition-colors">
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">{lineCount}</div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Lines</div>
                        </div>
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-600/50 text-center hover:bg-white dark:hover:bg-slate-800 transition-colors">
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">{charCount.toLocaleString()}</div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Characters</div>
                        </div>
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-600/50 text-center hover:bg-white dark:hover:bg-slate-800 transition-colors">
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">{sizeInKB}</div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">KB</div>
                        </div>
                    </div>

                    {/* JSON Content */}
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-600/50 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200/50 dark:border-slate-600/50 bg-slate-50/50 dark:bg-slate-700/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Complete Workflow Data
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(jsonString);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-all duration-200 hover:scale-105"
                                >
                                    <Copy className="w-3 h-3" />
                                    Copy
                                </button>
                            </div>
                        </div>
                        <div className="h-[72rem] min-h-96 max-h-[80vh] resize-y overflow-y-auto border-t border-slate-200 dark:border-slate-600">
                            <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-700/30 p-6 whitespace-pre-wrap break-words font-mono leading-relaxed block">
                                {jsonString}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 