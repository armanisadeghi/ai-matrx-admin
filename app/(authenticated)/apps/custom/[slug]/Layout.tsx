// app/(authenticated)/apps/custom/[slug]/layout.tsx
"use client";
import React from "react";
import { useEffect } from "react";
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

    useEffect(() => {
        if (status === "uninitialized" && slug) {
            const slugValue = Array.isArray(slug) ? slug[0] : slug;

            dispatch(
                fetchAppWithApplets({
                    idOrSlug: slugValue,
                    isSlug: true,
                    validationOptions: {
                        runValidations: false,
                        logResults: false,
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
            <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900 transition-colors">
                <SkeletonHeader />
                <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner />
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
