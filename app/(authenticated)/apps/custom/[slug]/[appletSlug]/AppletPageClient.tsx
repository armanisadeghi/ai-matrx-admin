// app/(authenticated)/apps/custom/[slug]/[appletSlug]/AppletPageClient.tsx
"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import AppletRunComponent from "@/features/applet/runner/AppletRunComponent";
import { AppletLayoutOption } from "@/types";

interface AppletPageClientProps {
    slug: string;
    appletSlug: string;
}

export default function AppletPageClient({ slug, appletSlug }: AppletPageClientProps) {
    const searchParams = useSearchParams();
    
    // Get parameters from search params with cryptic names
    const layoutTypeOverride = searchParams.get("lt") as AppletLayoutOption | undefined;
    const isPreview = searchParams.get("xp") === "1";
    const allowSubmit = searchParams.get("zs") !== "0"; // Default to true unless explicitly set to 0
    const responseLayoutTypeOverride = searchParams.get("rl") as AppletLayoutOption | undefined;
    const coordinatorId = searchParams.get("c") as string | undefined;

    return (
        <AppletRunComponent 
            appSlug={slug} 
            appletSlug={appletSlug} 
            layoutTypeOverride={layoutTypeOverride} 
            isPreview={isPreview} 
            allowSubmit={allowSubmit} 
            responseLayoutTypeOverride={responseLayoutTypeOverride || "flat-accordion"}
            coordinatorOverride={coordinatorId}
        />
    );
}

