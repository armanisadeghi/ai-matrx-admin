"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Layers, Plus, RefreshCw, Settings, ExternalLink } from "lucide-react";
import AppSelectCreateOverlay from "@/features/applet/builder/modules/smart-parts/apps/AppSelectCreateOverlay";
import AppletSelectCreateOverlay from "@/features/applet/builder/modules/smart-parts/applets/AppletSelectCreateOverlay";
import { CustomAppConfig, CustomAppletConfig } from "@/types/customAppTypes";
import { CockpitPanelProps } from '../types';
import { UseRecipeAgentSettingsHook } from '@/hooks/aiCockpit/useRecipeAgentSettings';
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { createAppletFromRecipe, updateAppletFromRecipe } from "@/lib/redux/app-builder/utils/auto-applet-creator";
import { addAppletToAppThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
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
    const store = useAppStore();
    const { toast } = useToast();

    const handleAppSaved = (app: CustomAppConfig) => {
        setSelectedApp(app);
        // Clear applet selection when app changes
        setSelectedApplet(null);
        console.log('App selected/created:', app);
    };

    const handleAppletSaved = (applet: CustomAppletConfig) => {
        setSelectedApplet(applet);
        console.log('Applet selected/created:', applet);
    };

    const handleGoToApp = () => {
        if (selectedApp?.slug) {
            window.open(`/apps/custom/${selectedApp.slug}`, '_blank');
        }
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

        if (!selectedApp) {
            toast({
                title: "No App Selected",
                description: "Please select an app first.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            let resultApplet: CustomAppletConfig;

            if (selectedApplet) {
                // Update existing applet using the utility function
                resultApplet = await updateAppletFromRecipe(
                    selectedApplet.id, 
                    recipeRecord.id, 
                    dispatch, 
                    store.getState
                );
                toast({
                    title: "Applet Updated",
                    description: `${resultApplet.name} has been updated with the current recipe.`,
                });
            } else {
                // Create new applet using the utility function
                const recipeName = recipeRecord?.name || "Recipe";
                resultApplet = await createAppletFromRecipe(recipeRecord.id, recipeName, dispatch);
                toast({
                    title: "Applet Created",
                    description: `${resultApplet.name} has been created from the recipe.`,
                });
            }

            // Associate the applet with the selected app if there is one
            if (selectedApp && resultApplet.id && (!resultApplet.appId || resultApplet.appId !== selectedApp.id)) {
                await dispatch(addAppletToAppThunk({ appletId: resultApplet.id, appId: selectedApp.id })).unwrap();
                toast({
                    title: "App Association",
                    description: `${resultApplet.name} has been associated with ${selectedApp.name}.`,
                });
            }

            setSelectedApplet(resultApplet);
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
                    Automated Applet Creation
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Row 1: App Selection */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/50">
                    <div className="flex-1 min-w-0">
                        {selectedApp ? (
                            <div className="text-xs font-medium text-foreground truncate">
                                {selectedApp.name}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic">
                                No app selected
                            </div>
                        )}
                    </div>
                    <AppSelectCreateOverlay
                        onAppSaved={handleAppSaved}
                        buttonLabel=""
                        dialogTitle="Select, Create, or Delete App"
                        showCreateOption={true}
                        showDelete={true}
                        buttonClassName="h-8 w-8 p-0"
                        buttonVariant="ghost"
                        triggerComponent={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <Settings className="h-4 w-4" />
                            </Button>
                        }
                    />
                </div>

                {/* Row 2: Applet Selection */}
                <div className={`flex items-center justify-between gap-2 p-2 rounded-md border border-border ${
                    selectedApp ? 'bg-muted/50' : 'bg-muted/20 opacity-50'
                }`}>
                    <div className="flex-1 min-w-0">
                        {selectedApplet ? (
                            <div className="text-xs font-medium text-foreground truncate">
                                {selectedApplet.name}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic">
                                {selectedApp ? "No applet selected" : "Select an app first"}
                            </div>
                        )}
                    </div>
                    <AppletSelectCreateOverlay
                        onAppletSaved={handleAppletSaved}
                        buttonLabel=""
                        dialogTitle="Select, Create, or Delete Applet"
                        showCreateOption={true}
                        showDelete={true}
                        buttonClassName="h-8 w-8 p-0"
                        buttonVariant="ghost"
                        triggerComponent={
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={!selectedApp}>
                                <Settings className="h-4 w-4" />
                            </Button>
                        }
                    />
                </div>

                {/* Row 3: Create/Update Applet from Recipe */}
                {recipeRecord && (
                    <div className="pt-2 border-t border-border space-y-2">
                        <Button
                            onClick={handleCreateAppletFromRecipe}
                            disabled={isCreating || !selectedApp}
                            className="w-full h-8 px-3 text-xs"
                            variant="outline"
                        >
                            {isCreating ? (
                                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                            ) : selectedApplet ? (
                                <RefreshCw className="h-3 w-3 mr-2" />
                            ) : (
                                <Plus className="h-3 w-3 mr-2" />
                            )}
                            {selectedApplet ? "Update from Recipe" : "Create from Recipe"}
                        </Button>
                        
                        {/* Go to App Button - only show when both app and applet are selected */}
                        {selectedApp && selectedApplet && (
                            <Button
                                onClick={handleGoToApp}
                                className="w-full h-8 px-3 text-xs"
                                variant="default"
                            >
                                <ExternalLink className="h-3 w-3 mr-2" />
                                Go to App
                            </Button>
                        )}
                        
                        {!selectedApp && (
                            <div className="text-xs text-muted-foreground text-center mt-1">
                                Select an app to enable recipe actions
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AppletResources;
