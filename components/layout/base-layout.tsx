// File: components/layout/base-layout.tsx

"use client";

import React, {useState} from "react";
import {Sidebar, SidebarBody, SidebarLink} from "../ui/sidebar";
import {cn} from "@/styles/themes/utils";
import {User} from "lucide-react";
import {ThemeSwitcher} from "@/styles/themes/ThemeSwitcher";
import StoreProvider from "@/lib/StoreProvider";
import {Logo, LogoIcon} from "@/components/layout/MatrixLogo";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/redux/store";

// Normal layout component
export const NormalLayout = ({ links, open, setOpen, children }: any) => (
    <div className={cn("min-h-screen bg-white dark:bg-black p-2")}>
        <div className={cn(
            "flex bg-gray-300 dark:bg-neutral-700 w-full max-w-7xl mx-auto overflow-hidden",
            "h-[calc(100vh-1rem)] rounded-xl border border-gray-300 dark:border-neutral-600"
        )}>
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="flex flex-col h-full justify-between">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {links.map((link: any, idx: number) => (
                                <SidebarLink key={idx} link={link} />
                            ))}
                        </div>
                    </div>
                    <div className="mt-auto pt-4 flex flex-col gap-4">
                        <ThemeSwitcher className="h-6 w-6 text-foreground" />
                        <SidebarLink
                            link={{
                                label: "Armani Sadeghi",
                                href: "#",
                                icon: (
                                    <User className="h-6 w-6 text-foreground" />
                                ),
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
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

// Extended bottom layout component
export const ExtendedBottomLayout = ({ links, open, setOpen, children }: any) => (
    <div className={cn("min-h-screen bg-white dark:bg-black overflow-hidden")}>
        <div className={cn(
            "flex bg-gray-300 dark:bg-neutral-700 w-full max-w-7xl mx-auto overflow-hidden",
            "h-[calc(100vh+0.5rem)] rounded-t-xl border-t border-x border-gray-300 dark:border-neutral-600"
        )}>
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="flex flex-col h-full justify-between">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {links.map((link: any, idx: number) => (
                                <SidebarLink key={idx} link={link} />
                            ))}
                        </div>
                    </div>
                    <div className="mt-auto pt-4 flex flex-col gap-4">
                        <ThemeSwitcher className="h-6 w-6 text-foreground" />
                        <SidebarLink
                            link={{
                                label: "Armani Sadeghi",
                                href: "#",
                                icon: (
                                    <User className="h-6 w-6 text-foreground" />
                                ),
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
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

// Window layout component (without sidebar)
export const WindowLayout = ({ children }: any) => (
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

