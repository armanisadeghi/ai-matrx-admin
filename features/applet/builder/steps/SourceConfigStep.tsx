"use client";
import React, { useRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import SectionCard from "@/components/official/cards/SectionCard"; // Make sure to import the updated SectionCard
import AppletSourceSelection from "../parts/SourceSelector";
import SourceConfigCardSelector from "../parts/SourceConfigCardSelector";
import { RecipeSelector } from "@/features/applet/builder/modules/smart-parts/applets";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAppDispatch } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { selectActiveAppletId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectAppletCompiledRecipeId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { AppletSourceConfig } from "@/lib/redux/app-builder/service/customAppletService";
import { selectAppletsByAppId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { setCompiledRecipeId, setActiveApplet } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { BrokerMapping } from "@/features/applet/builder/builder.types";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";


interface SelectAppStepProps {
    appId?: string;
    onUpdateCompletion?: (completion: {
        isComplete: boolean;
        canProceed: boolean;
        message?: string;
        footerButtons?: React.ReactNode;
    }) => void;
}

export const SourceConfigStep: React.FC<SelectAppStepProps> = ({ appId, onUpdateCompletion }) => {
    const dispatch = useAppDispatch();
    const activeAppletId = useAppSelector((state: RootState) => selectActiveAppletId(state));
    const appletCompiledRecipeId = useAppSelector((state: RootState) => selectAppletCompiledRecipeId(state, activeAppletId || ""));
    const applets = useAppSelector((state) => (appId ? selectAppletsByAppId(state, appId) : [])) as AppletBuilder[];

    const { quickReferenceRecords, quickReferenceKeyDisplayPairs, loadingState, getRecordIdByRecord } = useFetchQuickRef('recipe');
    const quickRefCount = quickReferenceRecords.length;

    const handleAppletChange = (value: string) => {
        dispatch(setActiveApplet(value));
    };

    const handleSourceTypeSelected = (sourceType: string) => {
        console.log(sourceType);
    };

    const handleRecipeSelected = (compiledRecipeId: string) => {
        if (activeAppletId) {
            dispatch(setCompiledRecipeId({ id: activeAppletId, compiledRecipeId }));
        }
    };

    const handleGetCompiledRecipeWithNeededBrokers = (sourceConfig: AppletSourceConfig | null) => {
        console.log(sourceConfig);
    };

    const handleSourceConfigSelected = (sourceConfig: AppletSourceConfig | null) => {
        console.log(sourceConfig);
    };

    const handleMappingCreated = (mapping: BrokerMapping) => {
        console.log("mapping", mapping);
    };

    // Create a button for "Create New Applet" if needed
    const headerActions = (
        <Button
            variant="outline"
            className="rounded-lg bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border text-blue-500 dark:text-blue-300 border-blue-500 dark:border-blue-600 hover:text-white flex items-center gap-2"
        >
            <PlusCircle className="h-4 w-4" />
            Create New Applet
        </Button>
    );

    // Create tabs for description
    const appletTabs = (
        <TabsList className="bg-transparent border-none">
            {applets.map((applet) => (
                <TabsTrigger key={applet.id} value={applet.id} className="border border-blue-500 dark:border-blue-700">
                    {applet.name}
                </TabsTrigger>
            ))}
        </TabsList>
    );


    const itemCounts = {
        "ai-recipe": quickRefCount,
        "ai-agent": 0,
        "action": 0,
        "api-integration": 0
    };
    
    return (
        <div className="w-full">
            <Tabs value={activeAppletId || ""} onValueChange={handleAppletChange} className="w-full">
                <SectionCard
                    title="Connect Applets to Intelligence"
                    description="Time to make real-life magic happen! Select a source for each applet."
                    descriptionNode={applets.length > 0 ? appletTabs : undefined}
                    headerActions={headerActions}
                >
                    {applets.map((applet) => (
                        <TabsContent key={applet.id} value={applet.id} className="mt-6">
                            <AppletSourceSelection onSelect={handleSourceTypeSelected} itemCounts={itemCounts} />
                            <RecipeSelector
                                compiledRecipeId={appletCompiledRecipeId}
                                onRecipeSelect={handleRecipeSelected}
                                onGetCompiledRecipeWithNeededBrokers={handleGetCompiledRecipeWithNeededBrokers}
                            />
                            <SourceConfigCardSelector
                                appletId={activeAppletId}
                                onSourceConfigSelected={handleSourceConfigSelected}
                                onMappingCreated={handleMappingCreated}
                            />
                        </TabsContent>
                    ))}
                    {applets.length === 0 && (
                        <div className="p-6 text-center">
                            <p className="text-gray-500 dark:text-gray-400">No applets found. Create a new applet to get started.</p>
                        </div>
                    )}
                </SectionCard>
            </Tabs>
        </div>
    );
};

export default SourceConfigStep;
