// app/(authenticated)/workflows/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ArmaniLayout from "@/components/matrx/Entity/prewired-components/layouts/ArmaniLayout";
import { cn } from "@/lib/utils";
import { getLayoutProps } from "./utils";

export default function EntityManagementPage() {
    const [isFullScreen, setIsFullScreen] = useState(false);

    const unifiedProps = useMemo(
        () =>
            getLayoutProps({
                handlers: {
                    setIsFullScreen: setIsFullScreen,
                },
            }),
        [setIsFullScreen]
    );

    return (
        <div className="h-full w-full bg-background">
            <motion.div className={cn("relative w-full h-full", isFullScreen && "fixed inset-0 z-50")} layout>
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-hidden p-2">
                        <ArmaniLayout unifiedLayoutProps={unifiedProps} className="h-full" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
