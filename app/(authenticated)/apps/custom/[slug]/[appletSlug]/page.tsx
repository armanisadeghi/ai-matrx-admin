// app/(authenticated)/apps/custom/[slug]/[appletSlug]/page.tsx
"use client";

import React, { useEffect } from "react";
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

    return <AppletLayoutManager appletId={appletId} />;
}
