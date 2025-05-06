"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/features/applet/builder/steps/Stepper";
import { AppConfigStep } from "@/features/applet/builder/steps/AppConfigStep";
import { AppletsConfigStep } from "@/features/applet/builder/steps/AppletsConfigStep";
import { GroupsConfigStep } from "@/features/applet/builder/steps/GroupsConfigStep";
import { FieldsConfigStep } from "@/features/applet/builder/steps/FieldsConfigStep";
import { SelectAppStep } from "@/features/applet/builder/steps/SelectAppStep";
import { PreviewConfig } from "@/features/applet/builder/previews/PreviewConfig";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { LoadingSpinner } from "@/components/ui/spinner";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectAppById, selectAppLoading, selectAppError, selectHasUnsavedAppChanges } from "@/lib/redux/app-builder/selectors/appSelectors";
import { CustomAppConfig, CustomAppletConfig } from "@/features/applet/builder/builder.types";
import AppBuilderDebugOverlay from "@/components/admin/AppBuilderDebugOverlay";
import { selectAppletError, selectAppletLoading, selectAppletsByAppId, selectHasUnsavedAppletChanges } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectContainerError, selectContainerLoading, selectHasUnsavedContainerChanges } from "@/lib/redux/app-builder/selectors/containerSelectors";
import { selectFieldError, selectFieldLoading, selectHasUnsavedFieldChanges } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { v4 as uuidv4 } from "uuid";
import { startNewApp } from "@/lib/redux/app-builder/slices/appBuilderSlice";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import { recompileAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import SourceConfigStep from "@/features/applet/builder/steps/SourceConfigStep";


// Interface for step completion and validation
interface StepCompletion {
    isComplete: boolean;
    canProceed: boolean;
    message?: string;
    footerButtons?: ReactNode;
}

export const ConfigBuilder = () => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();
    const [activeStep, setActiveStep] = useState(0);
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    // Track completion status for each step
    const [stepCompletions, setStepCompletions] = useState<StepCompletion[]>([
        { isComplete: false, canProceed: true }, // Select App step - always can proceed
        { isComplete: false, canProceed: false }, // App Config step
        { isComplete: false, canProceed: true }, // Applets Config step
        { isComplete: false, canProceed: true }, // Groups Config step
        { isComplete: false, canProceed: true }, // Fields Config step
        { isComplete: true, canProceed: false }, // Preview step - no next step
    ]);

    const [nextAppRecompile, setNextAppRecompile] = useState(false);
    const [nextAppletRecompile, setNextAppletRecompile] = useState(false);
    const [nextContainerRecompile, setNextContainerRecompile] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [compilingErrors, setCompilingErrors] = useState<string[]>([]);


    const allAppApplets = useAppSelector((state) => selectAppletsByAppId(state, selectedAppId)) as AppletBuilder[];

    const isAppletLoading = useAppSelector(selectAppletLoading);
    const isAppLoading = useAppSelector(selectAppLoading);
    const isContainerLoading = useAppSelector(selectContainerLoading);
    const isFieldLoading = useAppSelector(selectFieldLoading);
    const isAppError = useAppSelector(selectAppError);
    const isAppletError = useAppSelector(selectAppletError);
    const isContainerError = useAppSelector(selectContainerError);
    const isFieldError = useAppSelector(selectFieldError);

    const hasUnsavedAppChanges = useAppSelector(selectHasUnsavedAppChanges);
    const hasUnsavedAppletChanges = useAppSelector(selectHasUnsavedAppletChanges);
    const hasUnsavedContainerChanges = useAppSelector(selectHasUnsavedContainerChanges);
    const hasUnsavedFieldChanges = useAppSelector(selectHasUnsavedFieldChanges);

    const isLoading = isAppletLoading || isAppLoading || isContainerLoading || isFieldLoading || isCompiling;
    const isError = isAppletError || isAppError || isContainerError || isFieldError || compilingErrors.length > 0;
    const hasUnsavedChanges = hasUnsavedAppChanges || hasUnsavedAppletChanges || hasUnsavedContainerChanges || hasUnsavedFieldChanges;
    const needsRecompile = nextAppRecompile || nextAppletRecompile || nextContainerRecompile;


    // Applet state
    const [activeApplet, setActiveApplet] = useState<string | null>(null);


    const steps = [
        { id: "select-app", title: "Select App", description: "Create new or select existing" },
        { id: "app-info", title: "Configure App", description: "Basic information about your app" },
        { id: "applets-config", title: "Add Applets", description: "Define & Configure Applets" },
        { id: "groups-config", title: "Add Containers", description: "Create groups of Custom Fields" },
        { id: "fields-config", title: "Add Fields", description: "Define fields for each Container" },
        { id: "source-config", title: "Add Source", description: "Add source code for your app" },
        { id: "preview", title: "Deploy App", description: "Finalize & Launch your app" },
    ];


    const handleCreateNewApp = () => {
        const newAppId = uuidv4();
        dispatch(startNewApp({ id: newAppId }));
        setSelectedAppId(newAppId);
        setActiveStep(1);
    };

    const handleNext = async () => {
        if (activeStep === 0) {
            setActiveStep(1);
        } else if (activeStep === 1) {
            setActiveStep(2);
        } else if (activeStep === 2) {
            setActiveStep(3);
        } else if (activeStep === 3) {
            setActiveStep(4);
        } else if (activeStep === 4) {
            setActiveStep(5);
        } else if (activeStep === 5) {
            await recompileAllApplets();
        } else if (activeStep < steps.length - 1) {
            setActiveStep(activeStep + 1);
        }
    };

    const recompileAllApplets = async () => {
        if (!selectedAppId || !allAppApplets.length) {
            toast({
                title: "No applets found",
                description: "There are no applets to compile for this app.",
                variant: "destructive"
            });
            return;
        }

        try {
            setIsCompiling(true);
            setCompilingErrors([]);
            
            // Show toast to indicate compilation is starting
            toast({
                title: "Compiling Your App",
                description: "Please wait while we compile all applets..."
            });
            
            // Create array of promises for all recompile operations
            const recompilePromises = allAppApplets.map(applet => 
                dispatch(recompileAppletThunk(applet.id)).unwrap()
                    .catch(error => {
                        // Track individual applet compilation errors
                        setCompilingErrors(prev => [...prev, `Failed to compile ${applet.name || applet.id}: ${error.message || 'Unknown error'}`]);
                        return null;
                    })
            );
            
            // Wait for all recompilations to complete
            const results = await Promise.all(recompilePromises);
            
            // Check if any compilation failed
            if (compilingErrors.length > 0) {
                toast({
                    title: "Compilation Failed",
                    description: `Failed to compile some applets. Please check the errors and try again.`,
                    variant: "destructive"
                });
                return;
            }
            
            // Success case, move to the next step
            toast({
                title: "Compilation Complete",
                description: "Your app is ready for preview!"
            });
            
            setActiveStep(activeStep + 1);
        } catch (error: any) {
            toast({
                title: "Compilation Failed",
                description: error.message || "An unexpected error occurred during compilation.",
                variant: "destructive"
            });
        } finally {
            setIsCompiling(false);
        }
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1);
        }
    };

    const handleAppSaved = (appId: string) => {
        setSelectedAppId(appId);
        setActiveStep(2);
    };

    const handleAppSelected = (app: CustomAppConfig) => {
        setSelectedAppId(app.id);
        setActiveStep(1);
    };

    // Reset to the app selection step
    const resetToSelectStep = () => {
        setActiveStep(0);
        toast({
            title: "Select Different App",
            description: "You can select a different app or create a new one.",
        });
    };

    // Method for steps to report their completion status
    const updateStepCompletion = (stepIndex: number, completion: Partial<StepCompletion>) => {
        // Use a function form to ensure we're working with the latest state
        // and to prevent unnecessary re-renders
        setStepCompletions(prev => {
            // Check if the values are actually different before updating state
            const current = prev[stepIndex];
            const hasChanges = 
                completion.isComplete !== current.isComplete ||
                completion.canProceed !== current.canProceed ||
                completion.message !== current.message;
            
            // Only update state if there are actual changes
            if (!hasChanges) return prev;
            
            const updated = [...prev];
            updated[stepIndex] = { ...updated[stepIndex], ...completion };
            return updated;
        });
    };

    // Error display component
    const renderCompilationErrors = () => {
        if (compilingErrors.length === 0) return null;
        
        return (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <h3 className="text-red-600 dark:text-red-400 font-medium mb-2">Compilation Errors:</h3>
                <ul className="list-disc pl-5 text-sm text-red-600 dark:text-red-400">
                    {compilingErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                    ))}
                </ul>
            </div>
        );
    };

    // Footer rendering with conditional reset button and additional buttons
    const renderFooter = () => {
        const currentStepCompletion = stepCompletions[activeStep];
        const footerButtons = currentStepCompletion?.footerButtons;
        const statusMessage = currentStepCompletion?.message;

        return (
            <CardFooter className="flex flex-col md:flex-row space-y-3 md:space-y-0 pb-6">
                <div className="w-full md:w-1/3 flex items-center">
                    {activeStep > 0 ? (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={isLoading}
                                className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                Back
                            </Button>
                            {activeStep > 0 && (
                                <Button
                                    variant="ghost"
                                    onClick={resetToSelectStep}
                                    disabled={isLoading}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700"
                                >
                                    Select Different App
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div></div>
                    )}
                </div>

                {/* Status Message */}
                <div className="w-full md:w-1/3 text-center">
                    {statusMessage && (
                        <p className={`text-sm ${!currentStepCompletion?.canProceed ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                            {statusMessage}
                        </p>
                    )}
                </div>

                <div className="w-full md:w-1/3 flex justify-end gap-2 items-center">
                    {/* Additional button area - render any step-specific buttons */}
                    {footerButtons}
                    
                    <Button
                        onClick={handleNext}
                        disabled={
                            activeStep === steps.length - 1 || 
                            isLoading || 
                            !selectedAppId || 
                            !currentStepCompletion?.canProceed
                        }
                        className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
                    >
                        {activeStep === steps.length - 2 ? "Preview" : "Next"}
                    </Button>
                </div>
            </CardFooter>
        );
    };


    return (
        <div className="w-full h-full px-4 bg-white dark:bg-gray-900">
            <div className="w-full max-w-[1600px] mx-auto">
                <Card className="border-none bg-white dark:bg-gray-900 space-y-2">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-rose-500 pt-4">App Configuration Builder</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Stepper
                            steps={steps}
                            activeStep={activeStep}
                            onStepClick={(index) => {
                                // Only allow clicking on completed steps or the next step
                                if (index <= activeStep || index <= steps.findIndex((s) => s.id === "preview")) {
                                    setActiveStep(index);
                                }
                            }}
                        />

                        <div className="mt-8 relative">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex flex-col items-center justify-center z-10">
                                    <LoadingSpinner size="lg" />
                                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                                        {isCompiling ? "Compiling Your App..." : "Loading..."}
                                    </p>
                                </div>
                            )}

                            {renderCompilationErrors()}

                            {activeStep === 0 && (
                                <div className="w-full shadow-lg">
                                    <SelectAppStep
                                        onAppSelected={handleAppSelected}
                                        onCreateNewApp={handleCreateNewApp}
                                        selectedAppId={selectedAppId}
                                        onUpdateCompletion={(completion) => updateStepCompletion(0, completion)}
                                    />
                                </div>
                            )}

                            {activeStep === 1 && (
                                <div className="w-full rounded-3xl shadow-lg border border-emerald-200 dark:border-emerald-700">
                                    <AppConfigStep
                                        appId={selectedAppId}
                                        onAppSaved={handleAppSaved}
                                        onUpdateCompletion={(completion) => updateStepCompletion(1, completion)}
                                    />
                                </div>
                            )}

                            {activeStep === 2 && (
                                <div className="w-full rounded-3xl shadow-lg border border-emerald-200 dark:border-emerald-700">
                                    <AppletsConfigStep 
                                        appId={selectedAppId} 
                                        onUpdateCompletion={(completion) => updateStepCompletion(2, completion)}
                                    />
                                </div>
                            )}

                            {activeStep === 3 && (
                                <div className="w-full rounded-3xl shadow-lg border border-emerald-200 dark:border-emerald-700">
                                    <GroupsConfigStep 
                                        appId={selectedAppId} 
                                        onUpdateCompletion={(completion) => updateStepCompletion(3, completion)}
                                    />
                                </div>
                            )}

                            {activeStep === 4 && (
                                <div className="w-full rounded-3xl shadow-lg border border-emerald-200 dark:border-emerald-700">
                                    <FieldsConfigStep 
                                        appId={selectedAppId} 
                                        onUpdateCompletion={(completion) => updateStepCompletion(4, completion)}
                                    />
                                </div>
                            )}

                            {activeStep === 5 && (
                                <div className="w-full rounded-3xl shadow-lg border border-emerald-200 dark:border-emerald-700">
                                    <SourceConfigStep 
                                        appId={selectedAppId} 
                                        onUpdateCompletion={(completion) => updateStepCompletion(5, completion)}
                                    />
                                </div>
                            )}

                            {/* PreviewConfig has been updated to use Redux directly and only needs an appId */}
                            {activeStep === 6 && (
                                <div className="w-full rounded-3xl shadow-lg border border-emerald-200 dark:border-emerald-700">
                                    <PreviewConfig 
                                        appId={selectedAppId}
                                        onUpdateCompletion={(completion) => updateStepCompletion(6, completion)}
                                    />
                                </div>
                            )}
                        </div>
                        
                    </CardContent>
                    {renderFooter()}
                </Card>
            </div>
            <Toaster />
            <AppBuilderDebugOverlay position="middle-right" />
        </div>
    );
};

export default ConfigBuilder;
