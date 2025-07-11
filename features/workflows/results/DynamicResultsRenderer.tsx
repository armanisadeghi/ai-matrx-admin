'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Database, Clock } from "lucide-react";
import { getComponentByName, isValidComponentName, getAvailableComponentNames } from './DynamicComponentRegistry';

interface DynamicResultsRendererProps {
    componentName?: string;
    importPath?: string; // Not used with registry approach, but keeping for backwards compatibility
    nodeData: any;
    fallbackContent?: React.ReactNode;
}

const DynamicResultsRenderer: React.FC<DynamicResultsRendererProps> = ({
    componentName,
    importPath, // Not used with registry approach
    nodeData,
    fallbackContent
}) => {
    const [RegistryComponent, setRegistryComponent] = useState<React.ComponentType<any> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [componentInfo, setComponentInfo] = useState<string>('');

    useEffect(() => {
        // Reset state when props change
        setRegistryComponent(null);
        setError(null);
        setComponentInfo('');
        
        // Use SmartDisplay as default if no componentName is provided
        const effectiveComponentName = componentName || 'SmartDisplay';

        const loadComponent = () => {
            setLoading(true);
            setError(null);

            try {
                console.log('Looking up component in registry:', effectiveComponentName);
                
                // Check if component exists in registry
                if (!isValidComponentName(effectiveComponentName)) {
                    throw new Error(`Component "${effectiveComponentName}" not found in registry. Available components: ${getAvailableComponentNames().join(', ')}`);
                }

                // Get component from registry
                const registryEntry = getComponentByName(effectiveComponentName);
                
                if (!registryEntry) {
                    throw new Error(`Failed to get component "${effectiveComponentName}" from registry`);
                }

                console.log('Component found in registry:', registryEntry.displayName);
                setComponentInfo(`${registryEntry.displayName} - ${registryEntry.description || 'No description'}`);
                setRegistryComponent(() => registryEntry.component);
                
            } catch (err) {
                console.error('Failed to load component from registry:', err);
                setError(err instanceof Error ? err.message : 'Failed to load component from registry');
            } finally {
                setLoading(false);
            }
        };

        loadComponent();
    }, [componentName]);

    // Loading state
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
                    <div className="space-y-2">
                        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                            Loading Results Component
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Importing: {componentName || 'SmartDisplay (default)'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto" />
                    <div className="space-y-2">
                        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                            Component Load Error
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Failed to load the custom results component.
                        </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-xs text-red-700 dark:text-red-300 font-mono">
                            {error}
                        </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                        Using Fallback Display
                    </Badge>
                </div>
            </div>
        );
    }

    // Successfully loaded component
    if (RegistryComponent) {
        return (
            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
            }>
                <div className="flex-1 min-h-0">
                    <div className="h-full flex flex-col">                        
                        <div className="flex-1 min-h-0">
                            <RegistryComponent 
                                nodeData={nodeData}
                                {...nodeData}
                            />
                        </div>
                    </div>
                </div>
            </Suspense>
        );
    }

    // Show fallback content if provided (this should rarely happen now since we default to SmartDisplay)
    if (fallbackContent) {
        return <>{fallbackContent}</>;
    }

    // This should not normally be reached since we now default to SmartDisplay
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
                <AlertCircle className="h-12 w-12 text-amber-500 dark:text-amber-400 mx-auto" />
                <div className="space-y-2">
                    <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                        Unexpected State
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Component should have loaded by now. This may indicate an issue.
                    </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                    Fallback Display
                </Badge>
            </div>
        </div>
    );
};

export default DynamicResultsRenderer; 