"use client";

import { BrokerComponentsDisplay } from "@/components/brokers/main-layouts/BrokerComponentsDisplay";
import { usePrepareRecipeToRun } from "@/hooks/run-recipe/usePrepareRecipeToRun";

const DebugSection = ({ title, data }) => (
  <div className="mb-6 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
    <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">{title}</h3>
    <pre className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto text-slate-800 dark:text-slate-200">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

export default function DynamicPage() {
    const prepareRecipeHook = usePrepareRecipeToRun({
        recipeRecordKey: "id:ce63d140-5619-4f4f-9d7d-055f622f887b",
        version: "latest",
    });

    const {
        brokerComponentMetadataMap,
        isLoading,
        compiledRecipe,
        activeCompiledRecipeRecord,
        selectedVersion,
        recipeRecordKey,
        hasAllInputComponents
    } = prepareRecipeHook;

    const debug = false;

    return (
        <>
            <BrokerComponentsDisplay
                prepareRecipeHook={prepareRecipeHook}
                recipeTitle="Plan Your Perfect Trip"
                recipeDescription="Tell us about your travel plans"
                recipeActionText="Get Personalized Recommendations"
            />

            {debug && (
                <div className="p-6 max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">Debug Information</h2>

                    <DebugSection 
                        title="Recipe Record Key"
                        data={recipeRecordKey}
                    />
                    <DebugSection 
                        title="Selected Version"
                        data={selectedVersion}
                    />
                    <DebugSection 
                        title="Has All Input Components"
                        data={hasAllInputComponents}
                    />
                    
                    <DebugSection 
                        title="Redux Loading State"
                        data={isLoading}
                    />
                    
                    <DebugSection 
                        title="Broker Component Metadata"
                        data={brokerComponentMetadataMap}
                    />
                    
                    <DebugSection 
                        title="Active Compiled Recipe Record"
                        data={activeCompiledRecipeRecord}
                    />
                    
                    
                    <DebugSection 
                        title="Compiled Recipe"
                        data={compiledRecipe}
                    />
                </div>
            )}
        </>
    );
}