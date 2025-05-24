"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
    selectAppletRuntimeBySlug,
    selectAppletRuntimeActiveAppletId,
    setActiveAppletId,
    selectAppletIdBySlug,
    selectAppletRuntimeIsInitialized,
} from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { selectAppRuntimeIsInitialized } from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { LoadingSpinner } from "@/components/ui/spinner";
import AppletLayoutManager from "@/features/applet/runner/layouts/AppletLayoutManager";
import useAppletRecipe from "@/features/applet/hooks/useAppletRecipe";
import ResponseLayoutManager from "@/features/applet/runner/response/ResponseLayoutManager";
import PreviewLoadingWithMessage from "@/features/applet/builder/previews/PreviewLoadingWithMessage";
import { AppletLayoutOption } from "@/types";
import { useToastManager } from "@/hooks/useToastManager";

const SLUG_TO_COORDINATOR_MAP = {
    "core-info-generator": "app_suggestions",
    "applet-description-generator": "app_suggestions",
    "candidate-write-up-not-used": "candidate_profile_structured",
    "interview-transcript-analyzer": "modern_candidate_profile",
};

interface AppletRunComponentProps {
    appSlug: string;
    appletSlug: string;
    layoutTypeOverride?: AppletLayoutOption;
    isPreview?: boolean;
    allowSubmit?: boolean;
    isFullScreenPreview?: boolean;
    responseLayoutTypeOverride?: AppletLayoutOption;
    coordinatorOverride?: string;
}

export default function AppletRunComponent({
    appSlug,
    appletSlug,
    layoutTypeOverride,
    isPreview,
    allowSubmit = true,
    isFullScreenPreview = false,
    responseLayoutTypeOverride = "flat-accordion",
    coordinatorOverride = "default",
}: AppletRunComponentProps) {
    const dispatch = useAppDispatch();
    const isAppInitialized = useAppSelector(selectAppRuntimeIsInitialized);
    const isAppletInitialized = useAppSelector(selectAppletRuntimeIsInitialized);
    const applet = useAppSelector((state) => selectAppletRuntimeBySlug(state, appletSlug));
    const appletId = useAppSelector((state) => selectAppletIdBySlug(state, appletSlug));
    const activeAppletId = useAppSelector(selectAppletRuntimeActiveAppletId);
    const [taskSubmitted, setTaskSubmitted] = useState(false);
    const [socketTaskId, setSocketTaskId] = useState<string | null>(null);
    const toast = useToastManager();

    const { taskId, submitRecipe } = useAppletRecipe({ appletId });

    const coordinatorId = SLUG_TO_COORDINATOR_MAP[appletSlug] || "default";

    useEffect(() => {
        if (taskId) {
            setSocketTaskId(taskId);
        }
    }, [taskId]);

    const handleSubmit = () => {
        if (socketTaskId) {
            if (!allowSubmit) {
                console.log("In the current mode, Submit is not available.");
                toast.info("In the current mode, 'Submit' is not available. Please run your applet to test full functionality");
                return;
            }
            submitRecipe();
            setTaskSubmitted(true);
        }
    };

    // Set as active applet if not already active
    useEffect(() => {
        if (isAppInitialized && applet && activeAppletId !== applet.id) {
            dispatch(setActiveAppletId(applet.id));
        }
    }, [dispatch, isAppInitialized, applet, activeAppletId]);

    // Show loading state until app is initialized and applet data is available
    const isLoading = !isAppInitialized || !isAppletInitialized || !applet || !appletId;
    
    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                {isPreview ? (
                    <PreviewLoadingWithMessage isLoading={isLoading} isPreview={!!isPreview} />
                ) : (
                    <LoadingSpinner />
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <PreviewLoadingWithMessage isLoading={isLoading} isPreview={!!isPreview} />
            
            {!taskSubmitted && (
                <>
                    {isPreview && <div className="py-4"></div>}
                    <AppletLayoutManager
                        appSlug={appSlug}
                        appletId={appletId}
                        handleSubmit={handleSubmit}
                        layoutTypeOverride={layoutTypeOverride}
                        isPreview={isPreview}
                    />
                </>
            )}
            {taskSubmitted && taskId && (
                <ResponseLayoutManager
                    appSlug={appSlug}
                    appletId={appletId}
                    taskId={taskId}
                    handleSubmit={handleSubmit}
                    coordinatorId={coordinatorId}
                    isPreview={isPreview}
                    responseLayoutTypeOverride={responseLayoutTypeOverride}
                />
            )}
        </div>
    );
}
