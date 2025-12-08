"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Variable, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatText } from "@/utils/text/text-case-converter";
import { VariableValidationResult } from "@/features/prompts/utils/variable-validator";

interface VariableValidationPanelProps {
    validation: VariableValidationResult;
    onAddVariable?: (name: string) => void;
}

export function VariableValidationPanel({ validation, onAddVariable }: VariableValidationPanelProps) {
    const { usedVariables, unusedVariables, undefinedVariables, definedCount, referencedCount, hasIssues } = validation;

    return (
        <div className="space-y-6">
            {/* Overall Status */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Variable Validation</h3>
                
                {!hasIssues ? (
                    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">All Variables Valid</p>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                All defined variables are used in your messages.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                {undefinedVariables.length > 0 && unusedVariables.length > 0
                                    ? `${undefinedVariables.length} Undefined, ${unusedVariables.length} Unused`
                                    : undefinedVariables.length > 0
                                    ? `${undefinedVariables.length} Undefined Variable${undefinedVariables.length !== 1 ? 's' : ''}`
                                    : `${unusedVariables.length} Unused Variable${unusedVariables.length !== 1 ? 's' : ''}`}
                            </p>
                            <p className="text-xs mt-1 text-yellow-700 dark:text-yellow-400">
                                {undefinedVariables.length > 0 && "Variables used in messages but not yet defined. "}
                                {unusedVariables.length > 0 && "Variables defined but not used in messages."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <Variable className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">Defined Variables</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{definedCount}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">Referenced Variables</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{referencedCount}</p>
                    </div>
                </div>
            </div>

            {/* Undefined Variables */}
            {undefinedVariables.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Undefined Variables ({undefinedVariables.length})
                        </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        These variables are used in your messages but haven't been defined yet.
                    </p>
                    <div className="space-y-2">
                        {undefinedVariables.map((varName) => (
                            <div
                                key={varName}
                                className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                            >
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                                            {formatText(varName)}
                                        </span>
                                    </div>
                                    <p className="font-mono text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                                        {`{{${varName}}}`}
                                    </p>
                                </div>
                                {onAddVariable && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onAddVariable(varName)}
                                        className="h-8 text-xs flex-shrink-0"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Unused Variables */}
            {unusedVariables.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Unused Variables ({unusedVariables.length})
                        </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        These variables are defined but not used in any messages yet.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {unusedVariables.map((varName) => (
                            <div
                                key={varName}
                                className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                            >
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                                        {formatText(varName)}
                                    </span>
                                </div>
                                <p className="font-mono text-[10px] text-blue-700 dark:text-blue-400 mt-0.5">
                                    {varName}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Used Variables (Success) - Always show if there are any */}
            {usedVariables.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Used Variables ({usedVariables.length})
                        </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        These variables are properly defined and used in your messages.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {usedVariables.map((varName) => (
                            <div
                                key={varName}
                                className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                            >
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-medium text-green-900 dark:text-green-100">
                                        {formatText(varName)}
                                    </span>
                                </div>
                                <p className="font-mono text-[10px] text-green-700 dark:text-green-400 mt-0.5">
                                    {varName}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State - only show when no variables AND no references */}
            {definedCount === 0 && referencedCount === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Variable className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No Variables</p>
                    <p className="text-xs mt-1">Define variables to use dynamic content in your prompts</p>
                </div>
            )}
        </div>
    );
}

