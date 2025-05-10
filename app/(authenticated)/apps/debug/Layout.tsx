// app/(authenticated)/apps/custom/Layout.tsx

import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {

    return (
        <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">
            <main className="h-full w-full">{children}</main>

        </div>
    );
}
