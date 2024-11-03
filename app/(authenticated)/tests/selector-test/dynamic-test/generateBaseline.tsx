'use client';

import React, { useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { saveJson } from '@/actions/json.actions';

interface GenerateBaselineProps {
    filteredConfig: {
        name: string;
        selectorFn: Function;
        args: any[];
        isObjectArgs: boolean;
    }[];
}

const GenerateBaseline: React.FC<GenerateBaselineProps> = ({ filteredConfig }) => {
    const [isSaved, setIsSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const results = filteredConfig.map(({ name, selectorFn, args, isObjectArgs }) => {
        const result = useAppSelector((state) =>
            isObjectArgs ? selectorFn(state, ...args) : selectorFn(state, args[0])
        );

        return {
            name,
            props: args,
            result,
        };
    });

    useEffect(() => {
        const saveBaseline = async () => {
            // Skip if already saved successfully
            if (isSaved) return;

            try {
                const result = await saveJson({
                    filename: "baseline-results",
                    jsonData: results,
                    directoryType: 'app',
                    path: ['(authenticated)', 'tests', 'selector-test', 'dynamic-test', 'baselines']
                });

                if (result.success) {
                    setIsSaved(true);
                    setError(null);
                    console.log("Successfully saved baseline JSON");
                } else {
                    setError(result.error || "Failed to save baseline JSON");
                    console.error("Failed to save baseline JSON:", result.error);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                setError(errorMessage);
                console.error("Error saving baseline:", errorMessage);
            }
        };

        saveBaseline();
    }, [results, isSaved]);

    return error ? (
        <div className="text-red-500">Error: {error}</div>
    ) : isSaved ? (
        <div className="text-green-500">Baseline saved successfully</div>
    ) : null;
};

export default GenerateBaseline;
