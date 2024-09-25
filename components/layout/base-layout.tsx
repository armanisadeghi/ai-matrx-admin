// File: components/layout/base-layout.tsx

"use client";

import React from "react";
import { cn } from "@/styles/themes/utils";
import Sidebar from "./Sidebar";
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/redux/store';

// Normal layout component
export const NormalLayout = ({ links, open, setOpen, children }: any) => {
    const user = useSelector((state: RootState) => state.user);

    return (
        <div className={cn("min-h-screen bg-white dark:bg-black p-2")}>
            <div className={cn(
                "flex bg-gray-300 dark:bg-neutral-700 w-full max-w-7xl mx-auto overflow-hidden",
                "h-[calc(100vh-1rem)] rounded-xl border border-gray-300 dark:border-neutral-600"
            )}>
                <Sidebar open={open} setOpen={setOpen} links={links} />
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className={cn(
                        "flex-1",
                        "rounded-tl-2xl",
                        "bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white",
                        "overflow-y-auto"
                    )}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Extended bottom layout component
export const ExtendedBottomLayout = ({ links, open, setOpen, children }: any) => {
    const user = useSelector((state: RootState) => state.user);

    return (
        <div className={cn("min-h-screen bg-white dark:bg-black overflow-hidden")}>
            <div className={cn(
                "flex bg-gray-300 dark:bg-neutral-700 w-full max-w-7xl mx-auto overflow-hidden",
                "h-[calc(100vh+0.5rem)] rounded-t-xl border-t border-x border-gray-300 dark:border-neutral-600"
            )}>
                <Sidebar open={open} setOpen={setOpen} links={links} />
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className={cn(
                        "flex-1",
                        "rounded-tl-2xl",
                        "bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white",
                        "overflow-y-auto"
                    )}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Window layout component (without sidebar)
export const WindowLayout = ({ children }: any) => {
    const user = useSelector((state: RootState) => state.user);

    return (
        <div className={cn("min-h-screen bg-white dark:bg-black p-2")}>
            <div className={cn(
                "bg-gray-300 dark:bg-neutral-700 w-full max-w-7xl mx-auto overflow-hidden",
                "h-[calc(100vh-1rem)] rounded-xl border border-gray-300 dark:border-neutral-600"
            )}>
                <div className="h-full overflow-hidden flex flex-col">
                    <div className={cn(
                        "flex-1",
                        "bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white",
                        "overflow-y-auto"
                    )}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
