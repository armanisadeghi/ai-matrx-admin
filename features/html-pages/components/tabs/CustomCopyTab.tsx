"use client";

import React from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import type { HtmlPreviewTabProps } from "../types";

export function CustomCopyTab({ state, actions }: HtmlPreviewTabProps) {
    return (
        <div className="h-full flex flex-col justify-center items-center">
            <div className="max-w-md w-full space-y-6">
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Custom Copy Options</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select which elements to include in your copied HTML
                    </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <div className="space-y-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={state.includeBulletStyles}
                                onChange={(e) => actions.setIncludeBulletStyles(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Include Bullet Styles
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Keep custom bullet point styling in lists
                                </p>
                            </div>
                        </label>
                        
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={state.includeDecorativeLineBreaks}
                                onChange={(e) => actions.setIncludeDecorativeLineBreaks(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Include Decorative Line Breaks
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Keep horizontal rule separators (hr elements)
                                </p>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div className="text-center">
                    <button
                        onClick={actions.handleCopyCustom}
                        className={`inline-flex items-center gap-3 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                            state.copiedCustom
                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                        {state.copiedCustom ? (
                            <>
                                <CheckCircle2 size={18} />
                                Copied to Clipboard!
                            </>
                        ) : (
                            <>
                                <Copy size={18} />
                                Copy Custom HTML
                            </>
                        )}
                    </button>
                    
                    {!state.includeBulletStyles && !state.includeDecorativeLineBreaks && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                            All styling options are disabled
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

