'use client';

import QuickRefSelect from '@/app/entities/quick-reference/QuickRefSelectFloatingLabel';
import BrokerSectionOneColumn from '@/components/brokers/value-sections/BrokerSectionWrapper';
import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import {
    AiSettingsData,
    BrokerValueData,
    DataInputComponentData,
    DataInputComponentRecordWithKey,
    DataOutputComponentData,
    MessageBrokerData,
    MessageTemplateDataOptional,
    RecipeBrokerData,
    RecipeData,
    RecipeMessageData,
    RecipeProcessorData,
    RecipeRecordWithKey,
} from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGetorFetchRecords } from '@/app/entities/hooks/records/useGetOrFetch';

type RecipeDataWithKey = {
    id: string;
    name: string;
    status: 'other' | 'draft' | 'active_testing' | 'archived' | 'in_review' | 'live';
    description?: string;
    isPublic?: boolean;
    tags?: Record<string, unknown>;
    recipeBrokerInverse?: RecipeBrokerData[];
    version?: number;
    recipeMessageInverse?: RecipeMessageData[];
    recipeProcessorInverse?: RecipeProcessorData[];
    sampleOutput?: string;
    postResultOptions?: Record<string, unknown>;
    compiledRecipeInverse?: CompiledRecipeData[];
};

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

type CompiledRecipeEntry = {
    id: string;
    name: string;
    brokers: DataBrokerData[];
    messages: MessageTemplateDataOptional[];
    settings: AiSettingsData[];
};

type CompiledRecipeData = {
    id: string;
    compiledRecipe: CompiledRecipeEntry;
    createdAt: Date;
    isPublic: boolean;
    updatedAt: Date;
    authenticatedRead: boolean;
    recipeId?: string;
    recipeReference?: RecipeData;
    userId?: string;
    version?: number;
};

export default function Page() {
    const [selectedRecipeQuickRef, setSelectedRecipeQuickRef] = useState<QuickReferenceRecord | undefined>(undefined);
    const [recipeVersion, setRecipeVersion] = useState<number>(1);
    const [isVersionInitialized, setIsVersionInitialized] = useState(false);

    const selectors = createEntitySelectors('recipe');
    const compiledSelectors = createEntitySelectors('compiledRecipe');

    const recipeRecordWithRelatedData = useAppSelector((state) => selectors.selectRecordWithKey(state, selectedRecipeQuickRef?.recordKey)) as
        | RecipeRecordWithKey
        | undefined;

    const allCompiledVersions = useAppSelector((state) =>
        recipeRecordWithRelatedData?.id ? compiledSelectors.selectRecordsByFieldValue(state, 'recipeId', recipeRecordWithRelatedData.id) : []
    ) as CompiledRecipeData[];

    const activeCompiledRecipeRecord = allCompiledVersions.find((record) => record.version === recipeVersion);
    const brokers = activeCompiledRecipeRecord?.compiledRecipe?.brokers;

    console.log('-- Page with brokers:', brokers);

    const inputComponentIds = brokers?.map((broker) => `id:${broker.inputComponent}`) ?? [];

    const inputComponentsArray = useGetorFetchRecords('dataInputComponent', inputComponentIds) as DataInputComponentRecordWithKey[];

    const inputComponents = useMemo(() => {
        const componentsMap: Record<string, DataInputComponentData> = {};
        inputComponentsArray.forEach((component) => {
            if (component?.id) {
                componentsMap[component.id] = component;
            }
        });
        return componentsMap;
    }, [inputComponentsArray]);

    const hasAllInputComponents = useMemo(() => {
        if (!brokers || !inputComponents) return false;
        return brokers.every((broker) => broker.inputComponent && inputComponents[broker.inputComponent]?.component);
    }, [brokers, inputComponents]);

    // Set initial version when recipe is first loaded
    useEffect(() => {
        if (recipeRecordWithRelatedData?.version && !isVersionInitialized) {
            setRecipeVersion(recipeRecordWithRelatedData.version);
            setIsVersionInitialized(true);
        }
    }, [recipeRecordWithRelatedData?.version, isVersionInitialized]);

    const handleRecordChange = (record: QuickReferenceRecord) => {
        setSelectedRecipeQuickRef(record);
        setIsVersionInitialized(false);
    };

    const handleVersionChange = (value: string) => {
        setRecipeVersion(Number(value));
    };

    const sortedVersions = [...allCompiledVersions].sort((a, b) => b.version - a.version);

    const isLoading =
        selectedRecipeQuickRef && (!recipeRecordWithRelatedData || !activeCompiledRecipeRecord || (inputComponentIds.length > 0 && !hasAllInputComponents));

    return (
        <div className='h-full w-full bg-neutral-100 dark:bg-neutral-800'>
            {/* Top Selection Bar */}
            <div className='w-full items-center bg-neutral-100 dark:bg-neutral-800 border-b border-gray-200 dark:border-gray-800 px-4 py-2'>
                <div className='container mx-auto flex flex-row items-center gap-4 '>
                    {/* Recipe Selection */}
                    <div className='w-[320px]'>
                        <QuickRefSelect
                            entityKey='recipe'
                            fetchMode='fkIfk'
                            onRecordChange={handleRecordChange}
                        />
                    </div>

                    {/* Version Selection */}
                    {selectedRecipeQuickRef && sortedVersions.length > 0 && (
                        <div className='w-[200px]'>
                            <Select
                                value={recipeVersion.toString()}
                                onValueChange={handleVersionChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Select version' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Available Versions</SelectLabel>
                                        {sortedVersions.map((version) => (
                                            <SelectItem
                                                key={version.version}
                                                value={version.version.toString()}
                                            >
                                                Version {version.version}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className='h-full w-full px-4 py-8 space-y-6'>
                {/* Loading State */}
                {isLoading && (
                    <Alert>
                        <AlertDescription>Loading recipe data...</AlertDescription>
                    </Alert>
                )}

                {/* Error State */}
                {selectedRecipeQuickRef && !isLoading && !activeCompiledRecipeRecord && (
                    <Alert variant='destructive'>
                        <AlertDescription>No compiled recipe data found for the selected version.</AlertDescription>
                    </Alert>
                )}

                {/* Broker Section */}
                {selectedRecipeQuickRef && activeCompiledRecipeRecord && brokers && hasAllInputComponents && (
                    <div className='bg-neutral-100 dark:bg-neutral-800 border border-gray-200 dark:border-gray-800 rounded-lg'>
                        <BrokerSectionOneColumn
                            brokers={brokers}
                            inputComponents={inputComponents}
                            sectionTitle='Please provide some details...'
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
