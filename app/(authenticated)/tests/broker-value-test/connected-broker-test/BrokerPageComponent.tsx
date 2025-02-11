import { useCallback, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import EntityFormMinimalAnyRecord from '@/app/entities/forms/EntityFormMinimalAnyRecord';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { CompiledRecipeData, MatrxRecordId } from '@/types';

const initialLayoutProps = getUnifiedLayoutProps({
    entityKey: 'dataBroker',
    formComponent: 'MINIMAL',
    quickReferenceType: 'LIST',
    isExpanded: true,
    handlers: {},
});

const layoutProps = getUpdatedUnifiedLayoutProps(initialLayoutProps, {
    formComponent: 'MINIMAL',
    dynamicStyleOptions: {
        density: 'compact',
        size: 'sm',
    },
    dynamicLayoutOptions: {
        formStyleOptions: {
            fieldFiltering: {
                excludeFields: ['id'],
                defaultShownFields: ['name', 'defaultValue', 'dataType', 'defaultComponent', 'color'],
            },
        },
    },
});

const BrokerPageComponent = () => {
    const dispatch = useAppDispatch();
    const { selectors: compiledRecipeSelectors, actions: compiledRecipeActions } = useEntityTools('compiledRecipe');
    const {selectors: recipeSelectors} = useEntityTools('recipe');
    const { selectors: dataBrokerSelectors } = useEntityTools('dataBroker');
    const { actions: brokerValuActions, selectors: brokerValueSelectors } = useEntityTools('brokerValue');

    const activeRecipeId = useAppSelector(recipeSelectors.selectActiveRecordId);
    const matchingCompiledRecipes = useAppSelector((state) => compiledRecipeSelectors.selectRecordsByFieldValue(state, 'recipe', activeRecipeId));
    const availableVersions = matchingCompiledRecipes.map((record) => record.version);
    
    const activeCompiledRecipeRecord = useAppSelector(compiledRecipeSelectors.selectActiveRecord) as CompiledRecipeData;
    // State for selected version
    const [selectedVersion, setSelectedVersion] = useState<string>('');

    const setActiveCompiledRecipe = useCallback((recordId: MatrxRecordId) => {
        dispatch(compiledRecipeActions.setActiveRecordSmart(recordId));
    }, [dispatch, compiledRecipeActions]);

    // Callbacks for version selection
    const handleLatestVersion = useCallback(() => {
        const latestVersionRecord = matchingCompiledRecipes.reduce((latest, current) => {
            return !latest || current.version > latest.version ? current : latest;
        }, matchingCompiledRecipes[0]);
        
        if (latestVersionRecord) {
            setActiveCompiledRecipe(latestVersionRecord.id);
        }
    }, [matchingCompiledRecipes, setActiveCompiledRecipe]);

    const handleVersionSelect = useCallback((version: string) => {
        const selectedRecord = matchingCompiledRecipes.find(
            recipe => recipe.version === parseInt(version)
        );
        
        if (selectedRecord) {
            setActiveCompiledRecipe(selectedRecord.id);
        }
        setSelectedVersion(version);
    }, [matchingCompiledRecipes, setActiveCompiledRecipe]);

    const neededBrokers = activeCompiledRecipeRecord?.compiledRecipe.brokers || [];



    return (
        <div className="flex flex-col h-full py-3">
            <div className="flex items-center gap-4 mb-4">
                <Button 
                    variant="outline"
                    onClick={handleLatestVersion}
                    className="w-32"
                >
                    Latest Version
                </Button>
                
                <Select
                    value={selectedVersion}
                    onValueChange={handleVersionSelect}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select version..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableVersions.map((version) => (
                            <SelectItem 
                                key={version} 
                                value={version.toString()}
                            >
                                Version {version}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* <EntityFormMinimalAnyRecord
                recordId={recordId!}
                unifiedLayoutProps={layoutProps}
                onFieldChange={handleBrokerFieldUpdate}
            /> */}
        </div>
    );
};

export default BrokerPageComponent;