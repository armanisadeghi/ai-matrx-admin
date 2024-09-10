"use client";

import React, {useState} from "react";
import {Sidebar, SidebarBody, SidebarLink} from "../ui/sidebar";
import {cn} from "@/lib/utils";
import {Infinity, User} from "lucide-react";
import {motion} from "framer-motion";
import {ThemeSwitcher} from "@/components/layout/ThemeSwitcher";
import StoreProvider from "@/app/StoreProvider";
import Link from "next/link";

function BaseLayout({children, links}) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className={cn(
                "rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 max-w-7xl mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
                "h-screen" // for your use case, use `h-screen` instead of `h-[60vh]`
            )}
        >
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {links.map((link, idx) => (
                                <SidebarLink key={idx} link={link} />
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <ThemeSwitcher
                            className="h-6 w-6 text-foreground"/> {/* Distinct color for ThemeSwitcher */}
                        <SidebarLink
                            link={{
                                label: "Armani Sadeghi",
                                href: "#",
                                icon: (
                                    <User className="h-6 w-6 text-foreground"/> // {/* Distinct color for icon */}
                                ),
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
            <div className="flex flex-1 border-2 border-border">
                <div
                    className={cn(
                        "p-2 md:p-10 rounded-tl-2xl",
                        "bg-black text-foreground",
                        "flex flex-col gap-2 flex-1 w-full h-full",
                        "border-2 border-border"
                    )}
                >
                    <StoreProvider>
                        {children}
                    </StoreProvider>
                </div>
            </div>
        </div>
    );
}


const InfinitySymbol = ({ width = 28, height = 16, className = '' }) => (
    <svg
        width={width}
        height={height}
        viewBox="0 0 24 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path
            d="M18 6C18 3.79086 16.2091 2 14 2C11.7909 2 10 3.79086 10 6C10 3.79086 8.20914 2 6 2C3.79086 2 2 3.79086 2 6C2 8.20914 3.79086 10 6 10C8.20914 10 10 8.20914 10 6C10 8.20914 11.7909 10 14 10C16.2091 10 18 8.20914 18 6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const Logo = () => {
    return (
        <Link
            href="#"
            className="font-normal flex space-x-2 items-center text-sm text-black dark:text-white py-1 relative z-20"
        >
            <InfinitySymbol className="text-primary" />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-large whitespace-pre text-primary"
            >
                AI Matrx
            </motion.span>
        </Link>
    );
};

export const LogoIcon = () => {
    return (
        <Link
            href="#"
            className="font-normal flex space-x-2 items-center text-sm text-black dark:text-white py-1 relative z-20"
        >
            <InfinitySymbol className="text-primary" />
        </Link>
    );
};



export default BaseLayout;
