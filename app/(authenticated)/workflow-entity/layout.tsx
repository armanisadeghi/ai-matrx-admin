// /layout.tsx
"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { EntityPack } from "@/providers/packs/EntityPack";

export default function Layout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();

    return (
        <EntityPack>
            <div className="h-full w-full bg-textured transition-colors">
                <main className="h-full w-full">{children}</main>
            </div>
        </EntityPack>
    );
}
