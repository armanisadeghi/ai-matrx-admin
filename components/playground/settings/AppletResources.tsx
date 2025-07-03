"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Layers, Plus, RefreshCw } from "lucide-react";
import AppSelectCreateOverlay from "@/features/applet/builder/modules/smart-parts/apps/AppSelectCreateOverlay";
import AppletSelectCreateOverlay from "@/features/applet/builder/modules/smart-parts/applets/AppletSelectCreateOverlay";
import { CustomAppConfig, CustomAppletConfig } from "@/types/customAppTypes";
import { CockpitPanelProps } from '../types';
import { UseRecipeAgentSettingsHook } from '@/hooks/aiCockpit/useRecipeAgentSettings';
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createAppletFromRecipe, createContainerFromRecipe } from "@/lib/redux/app-builder/utils/auto-applet-creator";
import { updateAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { selectAppletById } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { getCompiledRecipeByVersionWithNeededBrokers } from "@/features/workflows/service/recipe-service";
import { useToast } from "@/components/ui/use-toast";

interface AppletResourcesProps {
    playgroundControls: CockpitPanelProps['playgroundControls'];
    recipeAgentSettingsHook: UseRecipeAgentSettingsHook;
}

const AppletResources: React.FC<AppletResourcesProps> = ({ 
    playgroundControls, 
    recipeAgentSettingsHook 
}) => {
    const [selectedApp, setSelectedApp] = useState<CustomAppConfig | null>(null);
    const [selectedApplet, setSelectedApplet] = useState<CustomAppletConfig | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const recipeRecord = playgroundControls.aiCockpitHook.recipeRecord;
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    const handleAppSaved = (app: CustomAppConfig) => {
        setSelectedApp(app);
        console.log('App selected/created:', app);
    };

    const handleAppletSaved = (applet: CustomAppletConfig) => {
        setSelectedApplet(applet);
        console.log('Applet selected/created:', applet);
    };

    const handleCreateAppletFromRecipe = async () => {
        if (!recipeRecord) {
            toast({
                title: "No Recipe Selected",
                description: "Please select a recipe first.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            if (selectedApplet) {
                // Update existing applet - inline logic
                const recipeConfig = await getCompiledRecipeByVersionWithNeededBrokers(recipeRecord.id);
                
                if (!recipeConfig) {
                    throw new Error(`Recipe with ID ${recipeRecord.id} not found`);
                }

                // Extract broker names from the recipe config
                const brokerNames = recipeConfig.neededBrokers?.map((broker) => broker.name) || [];
                
                // Create ONE container with ALL brokers as fields
                const container = await createContainerFromRecipe(selectedApplet.name, brokerNames, dispatch);
                
                // Update the applet with new containers and source config, preserving identity
                const changes = {
                    containers: [container],
                    dataSourceConfig: {
                        sourceType: "recipe" as const,
                        config: {
                            id: recipeConfig.id,
                            compiledId: recipeConfig.compiledId,
                            version: recipeConfig.version,
                            neededBrokers: recipeConfig.neededBrokers || []
                        }
                    },
                    compiledRecipeId: recipeConfig.compiledId,
                };
                
                const updatedApplet = await dispatch(updateAppletThunk({ id: selectedApplet.id, changes })).unwrap();
                setSelectedApplet(updatedApplet);
                toast({
                    title: "Applet Updated",
                    description: `${updatedApplet.name} has been updated with the current recipe.`,
                });
            } else {
                // Create new applet
                const recipeName = recipeRecord?.name || "Recipe";
                const newApplet = await createAppletFromRecipe(recipeRecord.id, recipeName, dispatch);
                setSelectedApplet(newApplet);
                toast({
                    title: "Applet Created",
                    description: `${newApplet.name} has been created from the recipe.`,
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create/update applet from recipe.",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    App Resources
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* App Management */}
                <div className="space-y-2">
                    {selectedApp ? (
                        <>
                            <div className="text-xs font-medium text-foreground truncate">
                                App: {selectedApp.name}
                            </div>
                            <AppSelectCreateOverlay
                                onAppSaved={handleAppSaved}
                                buttonLabel="Change App"
                                dialogTitle="Select, Create, or Delete App"
                                showCreateOption={true}
                                showDelete={true}
                                buttonClassName="w-full h-7 px-2 text-xs"
                            />
                        </>
                    ) : (
                        <AppSelectCreateOverlay
                            onAppSaved={handleAppSaved}
                            buttonLabel="Manage Apps"
                            dialogTitle="Select, Create, or Delete App"
                            showCreateOption={true}
                            showDelete={true}
                            buttonClassName="w-full h-7 px-2 text-xs"
                        />
                    )}
                </div>

                {/* Applet Management */}
                <div className="space-y-2">
                    {selectedApplet ? (
                        <>
                            <div className="text-xs font-medium text-foreground truncate">
                                Applet: {selectedApplet.name}
                            </div>
                            {selectedApplet.slug && (
                                <div className="text-xs text-muted-foreground truncate">
                                    Slug: {selectedApplet.slug}
                                </div>
                            )}
                            <AppletSelectCreateOverlay
                                onAppletSaved={handleAppletSaved}
                                buttonLabel="Change Applet"
                                dialogTitle="Select, Create, or Delete Applet"
                                showCreateOption={true}
                                showDelete={true}
                                buttonClassName="w-full h-7 px-2 text-xs"
                            />
                        </>
                    ) : (
                        <AppletSelectCreateOverlay
                            onAppletSaved={handleAppletSaved}
                            buttonLabel="Manage Applets"
                            dialogTitle="Select, Create, or Delete Applet"
                            showCreateOption={true}
                            showDelete={true}
                            buttonClassName="w-full h-7 px-2 text-xs"
                        />
                    )}
                </div>

                {/* Create/Update Applet from Recipe */}
                {recipeRecord && (
                    <div className="pt-2 border-t border-border">
                        <Button
                            onClick={handleCreateAppletFromRecipe}
                            disabled={isCreating}
                            className="w-full h-7 px-2 text-xs"
                            variant="outline"
                        >
                            {isCreating ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : selectedApplet ? (
                                <RefreshCw className="h-3 w-3 mr-1" />
                            ) : (
                                <Plus className="h-3 w-3 mr-1" />
                            )}
                            {selectedApplet ? "Update from Recipe" : "Create from Recipe"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AppletResources;
