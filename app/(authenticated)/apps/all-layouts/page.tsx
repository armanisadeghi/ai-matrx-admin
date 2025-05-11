"use client";

import React, { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
    selectAppletRuntimeActiveAppletId,
    setActiveAppletId,
    selectAppletRuntimeIsInitialized,
} from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import {
    selectAppRuntimeId,
    selectAppRuntimeIsInitialized,
    selectAppRuntimeStatus,
    selectAppRuntimeAppletList,
} from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { LoadingSpinner } from "@/components/ui/spinner";
import AppletLayoutManager from "@/features/applet/runner/layouts/AppletLayoutManager";
import { fetchAppWithApplets } from "@/lib/redux/app-runner/thunks/appRunnerThunks";
import { CustomAppHeader } from "@/features/applet/runner/header";

// Separator component with name
const SectionSeparator = ({ name }: { name: string }) => (
    <div className="w-full my-8">
        <div className="flex items-center">
            <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
            <span className="px-4 font-medium text-gray-600 dark:text-gray-400">{name}</span>
            <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
        </div>
    </div>
);

export default function SearchAppletPage() {
    const dispatch = useAppDispatch();
    const status = useAppSelector(selectAppRuntimeStatus);
    const appSlug = "test-applet";
    const appletId = "da4b93ac-176d-466c-bb13-c627d8def0c9";

    useEffect(() => {
        if (status === "uninitialized") {
            dispatch(
                fetchAppWithApplets({
                    idOrSlug: appSlug,
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
    }, [dispatch]);

    const appId = useAppSelector(selectAppRuntimeId);

    const availableApplets = useAppSelector(selectAppRuntimeAppletList);

    if (availableApplets?.length === 0 && status !== "loading" && status !== "uninitialized") {
        throw new Error("This app has no applets configured");
    }

    const validAppletId = availableApplets?.find((applet) => applet.appletId === appletId)?.appletId || availableApplets?.[0]?.appletId;

    const isAppInitialized = useAppSelector(selectAppRuntimeIsInitialized);
    const isAppletInitialized = useAppSelector(selectAppletRuntimeIsInitialized);
    const activeAppletId = useAppSelector(selectAppletRuntimeActiveAppletId);

    // Set as active applet if not already active
    useEffect(() => {
        if (isAppInitialized && validAppletId && activeAppletId !== validAppletId) {
            dispatch(setActiveAppletId(validAppletId));
        }
    }, [dispatch, isAppInitialized, validAppletId, activeAppletId]);

    if (!isAppInitialized || !isAppletInitialized || !validAppletId) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
            <CustomAppHeader isDemo={true} />

            <SectionSeparator name="Applet Specified Layout" />
            <AppletLayoutManager appletId={validAppletId} />
            {/* Original Layouts */}
            <SectionSeparator name="Open Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="open" />

            <SectionSeparator name="Horizontal Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="horizontal" />

            <SectionSeparator name="Stepper Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="stepper" />

            <SectionSeparator name="Vertical Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="vertical" />

            <SectionSeparator name="Two Column Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="twoColumn" />

            <SectionSeparator name="Three Column Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="threeColumn" />

            <SectionSeparator name="Four Column Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="fourColumn" />

            <SectionSeparator name="Tabs Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="tabs" />

            <SectionSeparator name="Accordion Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="accordion" />

            <SectionSeparator name="Flat Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="flat" />

            {/* First Set of New Layouts */}
            <SectionSeparator name="Carousel Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="carousel" />

            <SectionSeparator name="Floating Card Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="floatingCard" />

            <SectionSeparator name="Minimalist Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="minimalist" />

            <SectionSeparator name="Sidebar Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="sidebar" />

            <SectionSeparator name="Full Width Sidebar Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="fullWidthSidebar" />

            {/* Second Set of New Layouts */}
            <SectionSeparator name="Card Stack Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="cardStack" />

            <SectionSeparator name="Contextual Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="contextual" />

            <SectionSeparator name="Chat Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="chat" />

            <SectionSeparator name="Map Based Layout" />
            <AppletLayoutManager appletId={validAppletId} layoutTypeOverride="mapBased" />
        </div>
    );
}
