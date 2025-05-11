// app/(authenticated)/apps/custom/[slug]/layout.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LayoutPanelTop, Menu, User, SunMoon } from "lucide-react";

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

interface CustomAppLayoutProps {
    children: React.ReactNode;
}

// Skeleton header component that displays during loading
const SkeletonHeader: React.FC = () => {
    return (
        <div className="sticky top-0 w-full z-40 h-14 bg-white dark:bg-gray-900 transition-colors shadow-sm">
            <div className="flex items-center justify-between h-full px-4">
                {/* Left section - App icon placeholder */}
                <div className="flex items-center">
                    <LayoutPanelTop className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                    <div className="ml-3 w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                
                {/* Center section - Navigation items placeholders */}
                <div className="hidden md:flex space-x-6">
                    <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                
                {/* Right section - User and icons placeholders */}
                <div className="flex items-center space-x-3">
                    <SunMoon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function CustomAppLayout({ children }: CustomAppLayoutProps) {
    const params = useParams();
    const slug = params.slug as string;

    const dispatch = useAppDispatch();
    const status = useAppSelector(selectAppRuntimeStatus);
    const [error, setError] = useState<string | null>(null);
    const [fetchAttempts, setFetchAttempts] = useState(0);
    const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

    useEffect(() => {
        if (status === "uninitialized" && slug) {
            const slugValue = Array.isArray(slug) ? slug[0] : slug;
            setFetchAttempts(prev => prev + 1);
            setLastFetchTime(new Date().toISOString());
            
            console.log(`[DEBUG] Attempting to fetch app with slug: ${slugValue} (Attempt ${fetchAttempts + 1})`);

            dispatch(
                fetchAppWithApplets({
                    idOrSlug: slugValue,
                    isSlug: true,
                    validationOptions: {
                        runValidations: false,
                        logResults: false,
                    },
                })
            ).unwrap()
            .then(() => {
                console.log(`[DEBUG] Successfully fetched app with slug: ${slugValue}`);
                setError(null);
            })
            .catch((err) => {
                console.error(`[DEBUG] Error fetching app with slug: ${slugValue}`, err);
                setError(err.message || "Failed to fetch app data");
            });
        } else {
            console.log(`[DEBUG] Not fetching, status: ${status}, slug: ${slug}`);
        }
    }, [dispatch, slug]);

    // Set a timeout to show diagnostic info if the app takes too long to load
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (status === "loading" || status === "uninitialized") {
                console.log(`[DEBUG] App still loading after 10 seconds. Current status: ${status}`);
                // This won't set state to error, just provides diagnostic info
            }
        }, 10000);
        
        return () => clearTimeout(timeout);
    }, [status]);

    const activeAppletId = useAppSelector(selectAppletRuntimeActiveAppletId);
    const isDemo = useAppSelector(selectAppRuntimeIsDemo);
    const isDebug = useAppSelector(selectAppRuntimeIsDebug);
    const appId = useAppSelector(selectAppRuntimeId);
    const isAppInitialized = useAppSelector(selectAppRuntimeIsInitialized);

    // If the app hasn't initialized after 15 seconds, show diagnostic information
    const showDiagnostics = !isAppInitialized && (error || fetchAttempts > 0);

    if (!isAppInitialized) {
        return (
            <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900 transition-colors">
                <SkeletonHeader />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <LoadingSpinner />
                    
                    {showDiagnostics && (
                        <div className="mt-8 p-4 max-w-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left">
                            <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
                                App Loading Diagnostic
                            </h3>
                            <div className="text-sm text-red-700 dark:text-red-400 space-y-1">
                                <p><strong>App Slug:</strong> {slug || 'Not available'}</p>
                                <p><strong>App Status:</strong> {status}</p>
                                <p><strong>Fetch Attempts:</strong> {fetchAttempts}</p>
                                <p><strong>Last Attempt:</strong> {lastFetchTime || 'Not attempted'}</p>
                                {error && (
                                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded">
                                        <p className="font-semibold">Error:</p>
                                        <p className="font-mono text-xs whitespace-pre-wrap">{error}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-4 pt-2 border-t border-red-200 dark:border-red-800">
                                <p className="text-xs text-red-600 dark:text-red-500">
                                    This diagnostic panel is only visible to admins.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
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
