"use client";

import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen h-full bg-gray-50 dark:bg-gray-950">
            <main className="flex-1 flex flex-col">{children}</main>
        </div>
    );
}