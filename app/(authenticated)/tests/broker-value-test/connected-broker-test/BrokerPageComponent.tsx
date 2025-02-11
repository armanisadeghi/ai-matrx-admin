'use client';

import BrokerSectionOneColumn from '@/components/brokers/value-sections/BrokerSectionWrapper';
import {
    BrokerValueData,
    CompiledRecipeRecordWithKey,
    DataInputComponentData,
    DataOutputComponentData,
    MessageBrokerData,
} from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCompiledRecipe } from '@/hooks/run-recipe/useCompiledRecipe';
import RunRecipeSelection from '@/components/brokers/wired/RunRecipeSelection';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { useState } from 'react';


export type DataBrokerData = {
    id: string;
    name: string;
    dataType?: 'str' | 'bool' | 'dict' | 'float' | 'int' | 'list' | 'url';
    outputComponent?: string;
    dataInputComponentReference?: DataInputComponentData[];
    defaultValue?: string;
    inputComponent?: string;
    color?:
        | 'blue'
        | 'amber'
        | 'cyan'
        | 'emerald'
        | 'fuchsia'
        | 'gray'
        | 'green'
        | 'indigo'
        | 'lime'
        | 'neutral'
        | 'orange'
        | 'pink'
        | 'purple'
        | 'red'
        | 'rose'
        | 'sky'
        | 'slate'
        | 'stone'
        | 'teal'
        | 'violet'
        | 'yellow'
        | 'zinc';
    dataOutputComponentReference?: DataOutputComponentData[];
    brokerValueInverse?: BrokerValueData[];
    messageBrokerInverse?: MessageBrokerData[];
};



const BrokerPageComponent = () => {
    const [state, setState] = useState<{
        recipe: QuickReferenceRecord | undefined;
        version: number;
        compiledVersions: CompiledRecipeRecordWithKey[];
    }>({
        recipe: undefined,
        version: 1,
        compiledVersions: []
    });

    const {
        compiledRecipe,
        inputComponents,
        isLoading,
        hasError,
    } = useCompiledRecipe({
        selectedRecipe: state.recipe,
        selectedVersion: state.version,
        compiledVersions: state.compiledVersions
    });

    return (
        <div className='h-full w-full bg-neutral-100 dark:bg-neutral-800'>
            <div className='w-full items-center bg-neutral-100 dark:bg-neutral-800 border-b border-gray-200 dark:border-gray-800'>
                <div className='container mx-auto'>
                    <RunRecipeSelection onStateChange={setState} />
                </div>
            </div>

            <div className='h-full w-full px-4 py-8 space-y-6'>
                {isLoading && (
                    <Alert>
                        <AlertDescription>Loading recipe data...</AlertDescription>
                    </Alert>
                )}

                {hasError && (
                    <Alert variant='destructive'>
                        <AlertDescription>No compiled recipe data found for the selected version.</AlertDescription>
                    </Alert>
                )}

                {state.recipe && !isLoading && !hasError && compiledRecipe?.brokers && (
                    <div className='bg-neutral-100 dark:bg-neutral-800 border border-gray-200 dark:border-gray-800 rounded-lg'>
                        <BrokerSectionOneColumn
                            brokers={compiledRecipe.brokers}
                            inputComponents={inputComponents}
                            sectionTitle='Please provide some details...'
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default BrokerPageComponent;
