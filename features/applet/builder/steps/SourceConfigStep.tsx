"use client";

import React, { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import AppletSourceSelection from "../parts/SourceSelector";
import SourceConfigCardSelector from "../parts/SourceConfigCardSelector";
import { RecipeSelector } from "@/features/applet/builder/components/smart-parts/applets";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAppDispatch } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import { selectActiveAppletId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectAppletCompiledRecipeId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { AppletSourceConfig } from "@/lib/redux/app-builder/service/customAppletService";


import {
    setCompiledRecipeId,
    setActiveApplet,
} from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { BrokerMapping } from "@/features/applet/builder/builder.types";

interface SelectAppStepProps {
    onUpdateCompletion?: (completion: {
        isComplete: boolean;
        canProceed: boolean;
        message?: string;
        footerButtons?: React.ReactNode;
    }) => void;
}

export const SourceConfigStep: React.FC<SelectAppStepProps> = ({ onUpdateCompletion }) => {
    const dispatch = useAppDispatch();
    const activeAppletId = useAppSelector((state: RootState) => selectActiveAppletId(state));
    const appletCompiledRecipeId = useAppSelector((state: RootState) => selectAppletCompiledRecipeId(state, activeAppletId || ""));

    // useEffect(() => {
    //     onUpdateCompletion?.({
    //         isComplete: !!selectedAppId,
    //         canProceed: !!selectedAppId,
    //         message: selectedAppId
    //             ? `"${selectedApp?.name || "Unknown"}" selected`
    //             : "Please select an app or create a new one to continue",
    //     });
    // }, [selectedAppId, selectedApp]);

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


    return (
        <div className="w-full">
            <Card className="bg-white dark:bg-slate-900 overflow-hidden p-0 rounded-3xl border border-rose-200 dark:border-rose-600">
                <CardHeader className="bg-gray-100 dark:bg-gray-700 border-b border-rose-200 dark:border-rose-600 p-3 rounded-t-3xl">
                    <div className="grid md:grid-cols-[1fr_auto] gap-4 md:items-center">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-rose-500 font-medium text-lg">Connect Applets to Intelligence</h2>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                Time to make real-life magic happen! Select a source for each applet.
                            </p>
                        </div>
                        {/* <Button
                            onClick={onCreateNewApp}
                            variant="outline"
                            className="rounded-lg bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border text-blue-500 dark:text-blue-300 border-blue-500 dark:border-blue-600 hover:text-white flex items-center gap-2"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Create New App
                        </Button> */}
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <AppletSourceSelection onSelect={handleSourceTypeSelected} />

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
                </CardContent>
            </Card>
        </div>
    );
};

export default SourceConfigStep;
