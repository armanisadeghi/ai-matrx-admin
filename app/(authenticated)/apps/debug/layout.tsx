// app/(authenticated)/apps/debug/layout.tsx

import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {

    return (
        <div className="h-full w-full bg-textured transition-colors">
            <main className="h-full w-full">{children}</main>

        </div>
    );
}
