// app/(authenticated)/apps/custom/[slug]/[appletSlug]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
    selectAppletRuntimeBySlug,
    selectAppletRuntimeActiveAppletId,
    selectAppletRuntimeContainers,
    selectAppletRuntimeLayoutType,
    setActiveAppletId,
    selectAppletIdBySlug,
    selectAppletRuntimeIsInitialized,
} from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { selectAppRuntimeId, selectAppRuntimeIsInitialized } from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { LoadingSpinner } from "@/components/ui/spinner";
import AppletLayoutManager from "@/features/applet/runner/layouts/AppletLayoutManager";
import useAppletRecipe from "@/features/applet/hooks/useAppletRecipe";
import SocketAccordionResponse from "@/components/socket/response/SocketAccordionResponse";

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
    const containers = applet ? useAppSelector((state) => selectAppletRuntimeContainers(state, applet.id)) : null;
    const layoutType = applet ? useAppSelector((state) => selectAppletRuntimeLayoutType(state, applet.id)) : null;
    const appId = useAppSelector(selectAppRuntimeId);
    const [taskSubmitted, setTaskSubmitted] = useState(false);

    const [socketTaskId, setSocketTaskId] = useState<string | null>(null);

    const { taskId, submitRecipe } = useAppletRecipe({ appletId });

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
            {!taskSubmitted && (
                <AppletLayoutManager appletId={appletId} handleSubmit={handleSubmit} />
            )}
            {taskSubmitted && (
                <div className="w-full overflow-y-auto px-2 h-full space-y-2 scrollbar-none">
                    <AppletLayoutManager 
                        appletId={appletId} 
                        layoutTypeOverride="flat-accordion" 
                        initialExpanded={false} 
                        handleSubmit={handleSubmit} 
                    />
                    <SocketAccordionResponse taskId={taskId} />
                </div>
            )}
        </div>
    );
}
