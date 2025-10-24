// /layout.tsx

import React from "react";

export default function Layout({children}: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full">
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
};