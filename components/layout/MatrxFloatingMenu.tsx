"use client";

import React from "react";
import FloatingDock from "@/components/official/FloatingDock";
import { navigationLinks } from "@/constants/navigation-links";


export function MatrxFloatingMenu() {
    return (
        <FloatingDock 
            items={navigationLinks} 
            bgColorClassname="bg-zinc-100 dark:bg-zinc-850" 
            iconBgColorClassname="bg-zinc-200 dark:bg-zinc-700" 
        />
    );
} 