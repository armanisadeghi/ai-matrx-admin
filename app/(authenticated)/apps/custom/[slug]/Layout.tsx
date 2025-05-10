// app/(authenticated)/apps/custom/[slug]/layout.tsx
"use client";
import React from "react";
import { useEffect } from "react";
import { useParams } from "next/navigation";

import { CustomAppHeader } from "@/features/applet/runner/header/CustomAppHeader";
import { selectAppletRuntimeActiveAppletId } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import {
    selectAppRuntimeId,
    selectAppRuntimeIsDemo,
    selectAppRuntimeIsDebug,
    selectAppRuntimeIsInitialized,
    selectAppRuntimeStatus,
} from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { LoadingSpinner } from "@/components/ui/spinner";
import { fetchAppWithApplets } from "@/lib/redux/app-runner/thunks/appRunnerThunks";
import DebugFetch from "./debug";

// Note: We don't import metadata.ts directly here
// Next.js automatically uses it for metadata generation

interface CustomAppLayoutProps {
    children: React.ReactNode;
}

export default function CustomAppLayout({ children }: CustomAppLayoutProps) {
    const params = useParams();
    const slug = params.slug as string;

    const dispatch = useAppDispatch();
    const status = useAppSelector(selectAppRuntimeStatus);

    useEffect(() => {
        if (status === "uninitialized" && slug) {
            const slugValue = Array.isArray(slug) ? slug[0] : slug;

            dispatch(
                fetchAppWithApplets({
                    idOrSlug: slugValue,
                    isSlug: true,
                    validationOptions: {
                        runValidations: process.env.NODE_ENV !== "production",
                        logResults: process.env.NODE_ENV === "development",
                    },
                })
            );
        } else {
            console.log("Not fetching, status already:", status);
        }
    }, [dispatch, slug]);

    const activeAppletId = useAppSelector(selectAppletRuntimeActiveAppletId);
    const isDemo = useAppSelector(selectAppRuntimeIsDemo);
    const isDebug = useAppSelector(selectAppRuntimeIsDebug);
    const appId = useAppSelector(selectAppRuntimeId);
    const isAppInitialized = useAppSelector(selectAppRuntimeIsInitialized);

    if (!isAppInitialized) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 transition-colors">
                <DebugFetch />
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
            <CustomAppHeader appId={appId} activeAppletId={activeAppletId} isDemo={isDemo} isDebug={isDebug} />
            {children}
        </div>
    );
}
