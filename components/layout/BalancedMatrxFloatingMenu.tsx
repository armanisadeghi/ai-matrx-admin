"use client";

import React from "react";
import BalancedFloatingDock from "@/components/official/BalancedFloatingDock";
import { navigationLinks } from "@/constants/navigation-links";

export interface BalancedMatrxFloatingMenuProps {
    growthFactor?: number;
    labelPosition?: "side" | "bottom";
}

export function BalancedMatrxFloatingMenu({ 
    growthFactor = 1.5,
    labelPosition = "side" 
}: BalancedMatrxFloatingMenuProps) {
    return (
        <BalancedFloatingDock 
            items={navigationLinks} 
            bgColorClassname="bg-zinc-100 dark:bg-zinc-850" 
            iconBgColorClassname="bg-zinc-200 dark:bg-zinc-700"
            growthFactor={growthFactor}
            labelPosition={labelPosition}
        />
    );
} 