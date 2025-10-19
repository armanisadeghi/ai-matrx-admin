// /layout.tsx
"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Layout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();

    return (
        <div className="h-full w-full bg-textured transition-colors">
            <main className="h-full w-full">{children}</main>

        </div>
    );
}
