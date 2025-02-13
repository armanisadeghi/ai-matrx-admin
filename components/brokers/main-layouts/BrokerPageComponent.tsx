"use client";

import BrokerSectionWrapper from "@/components/brokers/value-sections/BrokerSectionWrapper";
import { CompiledRecipeRecordWithKey } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCompiledRecipe } from "@/hooks/run-recipe/useCompiledRecipe";
import RunRecipeSelection from "@/components/brokers/wired/RunRecipeSelection";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import { useState, useEffect, useRef } from "react";


const debug = false;

const BrokerPageComponent = () => {
    const [state, setState] = useState<{
        recipe: QuickReferenceRecord | undefined;
        version: number;
        compiledVersions: CompiledRecipeRecordWithKey[];
    }>({
        recipe: undefined,
        version: 1,
        compiledVersions: [],
    });

    const { compiledRecipe, inputComponents, isLoading, hasError } = useCompiledRecipe({
        selectedRecipe: state.recipe,
        selectedVersion: state.version,
        compiledVersions: state.compiledVersions,
    });

    const [columns, setColumns] = useState(1);
    const [hasSetInitialColumns, setHasSetInitialColumns] = useState(false);
    const previousComponentCountRef = useRef<number | null>(null);

    const getComponentCount = () => {
        if (!inputComponents || isLoading) return null;
        return Object.keys(inputComponents).length;
    };

    const getInitialColumnCount = (componentCount: number) => {
        if (componentCount <= 1) return 1;
        if (componentCount === 2) return 2;
        if (componentCount === 3) return 3;
        if (componentCount <= 5) return 2;
        return 3;
    };

    // Initial setup when components first load
    useEffect(() => {
        if (!isLoading && inputComponents && !hasSetInitialColumns) {
            const componentCount = getComponentCount();
            if (componentCount !== null) {
                setColumns(getInitialColumnCount(componentCount));
                setHasSetInitialColumns(true);
                previousComponentCountRef.current = componentCount;
            }
        }
    }, [inputComponents, isLoading, hasSetInitialColumns]);

    useEffect(() => {
        if (isLoading) return;

        const currentCount = getComponentCount();
        if (currentCount === null) return;

        // Only proceed if we have a previous count to compare against
        if (previousComponentCountRef.current !== null) {
            // Check if count has changed
            if (currentCount !== previousComponentCountRef.current) {
                // Reset columns based on new count
                setColumns(getInitialColumnCount(currentCount));
                setHasSetInitialColumns(false);
            }
        }

        previousComponentCountRef.current = currentCount;
    }, [inputComponents, isLoading]);

    // Reset when recipe changes
    useEffect(() => {
        setHasSetInitialColumns(false);
        previousComponentCountRef.current = null;
    }, [state.recipe]);

    const handleColumnsChange = (value: number) => {
        setColumns(value);
        setHasSetInitialColumns(true);
    };

    return (
        <div className="h-full w-full bg-neutral-100 dark:bg-neutral-800">
            <div className="w-full items-center bg-neutral-100 dark:bg-neutral-800 border-b border-gray-200 dark:border-gray-800">
                <RunRecipeSelection onStateChange={setState} onColumnsChange={handleColumnsChange} columns={columns} />
            </div>

            <div className="h-full w-full px-4 space-y-2">
                {isLoading && (
                    <Alert>
                        <AlertDescription>Loading recipe data...</AlertDescription>
                    </Alert>
                )}

                {hasError && (
                    <Alert variant="destructive">
                        <AlertDescription>No compiled recipe data found for the selected version.</AlertDescription>
                    </Alert>
                )}

                {state.recipe && !isLoading && !hasError && compiledRecipe?.brokers && (
                    <div className="bg-neutral-100 space-y-0 dark:bg-neutral-800 border border-gray-200 dark:border-gray-800 rounded-lg">
                        <BrokerSectionWrapper
                            brokers={compiledRecipe.brokers}
                            inputComponents={inputComponents}
                            sectionTitle=""
                            columns={columns}
                        />
                    </div>
                )}
                {debug && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                        <h3 className="text-sm font-medium mb-2">Compiled Recipe</h3>
                        <pre className="text-xs break-words whitespace-pre-wrap">{JSON.stringify(compiledRecipe, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrokerPageComponent;
