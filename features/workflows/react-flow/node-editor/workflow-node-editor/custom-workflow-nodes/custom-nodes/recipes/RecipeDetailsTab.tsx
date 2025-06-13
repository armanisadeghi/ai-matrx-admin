import { DbFunctionNode } from "@/features/workflows/types";
import { RecipeConfig } from "@/features/workflows/service/recipe-service";
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addWorkflowDependency, updateWorkflowDependency, removeWorkflowDependency } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/dependency-utils";

// New tab component to display recipe details
const RecipeDetailsTab = ({
    nodeData,
    onNodeUpdate,
    recipeDetails,
    loading,
    error,
}: {
    nodeData: DbFunctionNode;
    onNodeUpdate: (nodeData: DbFunctionNode) => void;
    recipeDetails: RecipeConfig | null;
    loading: boolean;
    error: string | null;
}) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const currentDependencies = nodeData.additional_dependencies || [];

    // Helper function to check if a broker is already a dependency
    const isBrokerInDependencies = (brokerId: string): boolean => {
        return currentDependencies.some(dep => dep.source_broker_id === brokerId);
    };

    // Helper function to add a broker as a dependency
    const addBrokerDependency = (brokerId: string) => {
        // First add an empty dependency
        addWorkflowDependency(nodeData, (updatedNode) => {
            // Then update the last dependency with the broker ID
            const lastIndex = (updatedNode.additional_dependencies?.length || 1) - 1;
            updateWorkflowDependency(updatedNode, onNodeUpdate, lastIndex, 'source_broker_id', brokerId);
        });
    };

    // Helper function to remove a broker dependency
    const removeBrokerDependency = (brokerId: string) => {
        const dependencyIndex = currentDependencies.findIndex(dep => dep.source_broker_id === brokerId);
        if (dependencyIndex !== -1) {
            removeWorkflowDependency(nodeData, onNodeUpdate, dependencyIndex);
        }
    };

    // const addDependency = () => {
    //     updateWorkflowDependency(node, onNodeUpdate, 'source_broker_id', '');
    // };

    return (
        <div className="space-y-4 p-4">
            {loading && <div className="text-gray-600 dark:text-gray-400">Loading recipe details...</div>}

            {error && <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">Error: {error}</div>}

            {recipeDetails && (
                <div className="space-y-4">
                    {/* Core Recipe Information */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {recipeDetails.name || 'Unnamed Recipe'}
                                </h4>
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            ID
                                        </span>
                                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-gray-700 dark:text-gray-300">
                                            {recipeDetails.id}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(recipeDetails.id)}
                                            className="inline-flex items-center p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                            title="Copy ID to clipboard"
                                        >
                                            {copied ? (
                                                <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            Version
                                        </span>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                            v{recipeDetails.version}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Needed Brokers Table */}
                    {recipeDetails.neededBrokers && recipeDetails.neededBrokers.length > 0 && (
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-medium mb-3">Needed Brokers</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs">
                                            <TableHead className="h-8">Name</TableHead>
                                            <TableHead className="h-8">ID</TableHead>
                                            <TableHead className="h-8">Required</TableHead>
                                            <TableHead className="h-8">Data Type</TableHead>
                                            <TableHead className="h-8">Dependencies</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recipeDetails.neededBrokers.map((broker, index) => (
                                            <TableRow key={index} className="text-xs">
                                                <TableCell className="py-2 font-medium">{broker.name}</TableCell>
                                                <TableCell className="py-2">
                                                    <span className="font-mono bg-blue-50 dark:bg-blue-950 px-1 py-0.5 rounded text-xs">
                                                        {broker.id}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    {broker.required ? (
                                                        <Badge variant="destructive" className="text-xs">Required</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <Badge variant="outline" className="text-xs">{broker.dataType || 'N/A'}</Badge>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    {isBrokerInDependencies(broker.id) ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => removeBrokerDependency(broker.id)}
                                                            className="h-6 px-2 text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            Remove from Dependencies
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => addBrokerDependency(broker.id)}
                                                            className="h-6 px-2 text-xs text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                        >
                                                            Add to Dependencies
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Other Details in Collapsible Sections */}
                    <div className="space-y-3">
                        {recipeDetails.postResultOptions && Object.keys(recipeDetails.postResultOptions).length > 0 && (
                            <details className="bg-gray-50 dark:bg-gray-800 rounded-md">
                                <summary className="cursor-pointer p-3 font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                    Post Result Options
                                </summary>
                                <div className="p-3 pt-0">
                                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {JSON.stringify(recipeDetails.postResultOptions, null, 2)}
                                    </pre>
                                </div>
                            </details>
                        )}

                        {recipeDetails.settings && Object.keys(recipeDetails.settings).length > 0 && (
                            <details className="bg-gray-50 dark:bg-gray-800 rounded-md">
                                <summary className="cursor-pointer p-3 font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                    Settings
                                </summary>
                                <div className="p-3 pt-0">
                                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {JSON.stringify(recipeDetails.settings, null, 2)}
                                    </pre>
                                </div>
                            </details>
                        )}

                        {/* Full Data JSON */}
                        <details className="bg-gray-50 dark:bg-gray-800 rounded-md">
                            <summary className="cursor-pointer p-3 font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                Full Data
                            </summary>
                            <div className="p-3 pt-0">
                                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {JSON.stringify(recipeDetails, null, 2)}
                                </pre>
                            </div>
                        </details>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecipeDetailsTab;
