"use client";

import React from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import type { HtmlPreviewTabProps } from "../types";

export function HtmlControlsTab({ state, actions }: HtmlPreviewTabProps) {
    return (
        <div className="h-full flex flex-col justify-center items-center">
            <div className="max-w-2xl w-full space-y-6">
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        HTML Management
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Control how your HTML is generated from markdown
                    </p>
                </div>

                {/* Status Indicator */}
                {state.isHtmlDirty && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />
                            <div>
                                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                                    HTML Needs Regeneration
                                </h4>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    You've made changes to the markdown. Click "Regenerate HTML" to update the HTML content.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Buttons */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <div className="space-y-4">
                        {/* Regenerate HTML Button */}
                        <div>
                            <button
                                onClick={actions.handleRegenerateHtml}
                                disabled={!state.isHtmlDirty}
                                className={`w-full flex items-center justify-center gap-3 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                                    state.isHtmlDirty
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                <RefreshCw size={18} />
                                Regenerate HTML from Markdown
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                {state.isHtmlDirty 
                                    ? "Click to convert your markdown edits to HTML"
                                    : "HTML is up to date with your markdown"}
                            </p>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 my-4"></div>

                        {/* Refresh Markdown Button */}
                        <div>
                            <button
                                onClick={actions.handleRefreshMarkdown}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3 text-sm font-medium rounded-lg transition-colors bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300"
                            >
                                <RefreshCw size={18} />
                                Reset to Original Markdown
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                Discard all markdown changes and restore to initial content
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                        How it works
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                        <li>• Edit markdown in any of the markdown tabs</li>
                        <li>• HTML is marked as "dirty" when markdown changes</li>
                        <li>• Click "Regenerate HTML" to convert markdown to HTML</li>
                        <li>• Saved pages are preserved until you regenerate HTML</li>
                        <li>• Use "Reset" to undo all markdown changes</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

