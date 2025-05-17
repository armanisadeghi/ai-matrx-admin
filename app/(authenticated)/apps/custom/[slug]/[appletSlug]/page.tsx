// app/(authenticated)/apps/custom/[slug]/[appletSlug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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


const SLUG_TO_VIEW_MAP = {
    "core-info-generator": "appSuggestions",
    "candidate-write-up-not-used": "candidateProfileStructured",
}




export default function AppletPage() {
    const params = useParams();
    const slug = params.slug as string;
    const appletSlug = params.appletSlug as string;

    const dispatch = useAppDispatch();
    const isAppInitialized = useAppSelector(selectAppRuntimeIsInitialized);
    const isAppletInitialized = useAppSelector(selectAppletRuntimeIsInitialized);
    const applet = useAppSelector((state) => selectAppletRuntimeBySlug(state, appletSlug));
    const appletId = useAppSelector((state) => selectAppletIdBySlug(state, appletSlug));
    const activeAppletId = useAppSelector(selectAppletRuntimeActiveAppletId);
    const [taskSubmitted, setTaskSubmitted] = useState(false);
    const [socketTaskId, setSocketTaskId] = useState<string | null>(null);

    const { taskId, submitRecipe } = useAppletRecipe({ appletId });

    const viewName = SLUG_TO_VIEW_MAP[appletSlug] || "default";

    console.log("AppletPage viewName", viewName);

    useEffect(() => {
        if (taskId) {
            setSocketTaskId(taskId);
        }
    }, [taskId]);

    const handleSubmit = () => {
        if (socketTaskId) {
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
    if (!isAppInitialized || !isAppletInitialized || !applet || !appletId) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            {!taskSubmitted && <AppletLayoutManager appletId={appletId} handleSubmit={handleSubmit} />}

            {taskSubmitted && taskId && <ResponseLayoutManager appletId={appletId} taskId={taskId} handleSubmit={handleSubmit} viewName={viewName}/>}
        </div>
    );
}
