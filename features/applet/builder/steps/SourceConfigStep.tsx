"use client";
import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PanelRight, PlusCircle, BrainCircuit, Variable } from "lucide-react";
import SectionCard from "@/components/official/cards/SectionCard";
import AppletSourceSelection from "@/features/applet/builder/modules/broker-mapping/SourceSelector";
import { RecipeSelector } from "@/features/applet/builder/modules/smart-parts/applets";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAppDispatch } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { selectActiveAppletId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectAppletCompiledRecipeId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectAppletSourceConfig } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectIsAppletDirtyById } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { AppletSourceConfig } from "@/lib/redux/app-builder/service/customAppletService";
import { selectAppletsByAppId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import {
    setCompiledRecipeId,
    setActiveApplet,
    addBrokerMapping,
    addSourceConfig,
} from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { saveAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { Broker, BrokerMapping } from "@/features/applet/builder/builder.types";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import NeededBrokersCard from "../modules/broker-mapping/components/NeededBrokersCard";
import RecipeDetailsCard from "../modules/broker-mapping/components/RecipeDetailsCard";
import BrokerMappingCard from "../modules/broker-mapping/components/BrokerMappingCard";
import EmptyStateCard from "@/components/official/cards/EmptyStateCard";
import { cn } from "@/lib/utils";

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
    const sourceConfigs = useAppSelector((state) => (activeAppletId ? selectAppletSourceConfig(state, activeAppletId) : null));
    // Get if the active applet has unsaved changes
    const isAppletDirty = useAppSelector((state) => activeAppletId ? selectIsAppletDirtyById(state, activeAppletId) : false);
    
    // Get the active source config from Redux
    const activeSourceConfig = sourceConfigs && sourceConfigs.length > 0 ? sourceConfigs[0] : null;
    
    // Keep UI state for source type and broker selection
    const [activeSourceType, setActiveSourceType] = useState<string | null>(null);
    const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);

    const { quickReferenceRecords, quickReferenceKeyDisplayPairs, loadingState, getRecordIdByRecord } = useFetchQuickRef("recipe");
    const quickRefCount = quickReferenceRecords.length;

    useEffect(() => {
        if (!activeAppletId && applets.length > 0) {
            dispatch(setActiveApplet(applets[0].id));
        }
    }, [activeAppletId, applets, dispatch]);

    const handleAppletChange = (value: string) => {
        dispatch(setActiveApplet(value));
    };

    const handleSourceTypeSelected = (sourceType: string) => {
        setActiveSourceType(sourceType);
    };

    const handleRecipeSelected = (compiledRecipeId: string) => {
        if (activeAppletId) {
            dispatch(setCompiledRecipeId({ id: activeAppletId, compiledRecipeId }));
        }
    };

    const handleGetCompiledRecipeWithNeededBrokers = (sourceConfig: AppletSourceConfig | null) => {
        if (sourceConfig && activeAppletId) {
            dispatch(addSourceConfig({ id: activeAppletId, sourceConfig }));
        }
    };

    const handleSourceConfigSelected = (sourceConfig: AppletSourceConfig | null) => {
        if (sourceConfig && activeAppletId) {
            dispatch(addSourceConfig({ id: activeAppletId, sourceConfig }));
        }
    };

    const handleMappingCreated = (mapping: BrokerMapping) => {
        dispatch(addBrokerMapping({ id: activeAppletId, brokerMapping: mapping }));
    };

    const handleBrokerSelect = (broker: Broker) => {
        setSelectedBroker(broker);
    };

    // Handler to save the applet
    const handleSaveApplet = async () => {
        if (activeAppletId) {
            try {
                await dispatch(saveAppletThunk(activeAppletId)).unwrap();
            } catch (error) {
                console.error("Failed to save applet:", error);
                // You might want to show an error toast/notification here
            }
        }
    };

    // Helper function to clear source config (if needed in the future)
    const handleClearSourceConfig = () => {
        if (activeAppletId && sourceConfigs && sourceConfigs.length > 0) {
            // Use removeSourceConfig action if needed
            // We'd need to import it
            // dispatch(removeSourceConfig({ id: activeAppletId, configId: sourceConfigs[0].config.id }));
            setActiveSourceType(null);
            setSelectedBroker(null);
        }
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
        action: 0,
        "api-integration": 0,
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
                        <TabsContent key={applet.id} value={applet.id} className="my-6 space-y-4">
                            <AppletSourceSelection onSelect={handleSourceTypeSelected} itemCounts={itemCounts} />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1 space-y-4">
                                    {activeSourceType === "ai-recipe" ? (
                                        <SectionCard title="Select an AI Recipe" color="gray">
                                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                                <RecipeSelector
                                                    compiledRecipeId={appletCompiledRecipeId}
                                                    onRecipeSelect={handleRecipeSelected}
                                                    onGetCompiledRecipeWithNeededBrokers={handleGetCompiledRecipeWithNeededBrokers}
                                                />
                                            </div>
                                        </SectionCard>
                                    ) : (
                                        <SectionCard title="Intelligence Source Selection" color="gray">
                                            <EmptyStateCard
                                                title="Select an Intelligence Source"
                                                description={`${itemCounts["ai-agent"]} Agents, ${itemCounts["action"]} Actions, ${itemCounts["api-integration"]} API Integrations, ${itemCounts["ai-recipe"]} Recipes`}
                                                icon={BrainCircuit}
                                            />
                                        </SectionCard>
                                    )}

                                    {appletCompiledRecipeId && <RecipeDetailsCard sourceConfig={activeSourceConfig} appletId={activeAppletId} />}

                                    <NeededBrokersCard
                                        sourceConfig={activeSourceConfig}
                                        selectedBroker={selectedBroker}
                                        onBrokerSelect={handleBrokerSelect}
                                    />

                                    {/* Save Button */}
                                    <div className="mt-4">
                                        <Button
                                            onClick={handleSaveApplet}
                                            disabled={!isAppletDirty}
                                            className={cn(
                                                "w-full",
                                                isAppletDirty 
                                                    ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800" 
                                                    : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
                                            )}
                                        >
                                            {isAppletDirty ? "Save Changes" : "No Changes to Save"}
                                        </Button>
                                    </div>
                                </div>
                                {/* Second and Third columns: Broker Mapping */}
                                {activeSourceType && (
                                    <div className="md:col-span-2">
                                        {selectedBroker ? (
                                            <BrokerMappingCard
                                                selectedBroker={selectedBroker}
                                                appletId={activeAppletId}
                                                onMappingCreated={handleMappingCreated}
                                            />
                                        ) : (
                                            <EmptyStateCard
                                                title="Broker & Field Mapping"
                                                description="Select a broker from the list of Needed Brokers."
                                                icon={Variable}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                    {applets.length === 0 && (
                        <SectionCard title="No applets found" description="Create a new applet to get started">
                            <EmptyStateCard
                                title="Select an Applet to Continue"
                                description="Please select an applet and group from the sidebar to start configuring fields for your component."
                                icon={PanelRight}
                            />
                        </SectionCard>
                    )}
                </SectionCard>
            </Tabs>
        </div>
    );
};

export default SourceConfigStep;
