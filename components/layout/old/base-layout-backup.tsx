"use client";

import React, {useState} from "react";
import {Sidebar, SidebarBody, SidebarLink} from "../../ui/sidebar";
import {cn} from "@/styles/themes/utils";
import {Infinity, User} from "lucide-react";
import {motion} from "framer-motion";
import {ThemeSwitcher} from "@/styles/themes/ThemeSwitcher";
import StoreProvider from "@/providers/StoreProvider";

function BaseLayout({children, links}) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className={cn(
                "rounded-md flex flex-col md:flex-row",
                "w-full flex-1 max-w-7xl mx-auto overflow-hidden",
                "bg-background text-foreground",
                "border border-border",
                "h-screen"
            )}
        >
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="h-8 relative flex items-center">
                            <Infinity className="w-6 h-6 z-10 text-primary"/>
                            <motion.span
                                className="text-primary font-bold text-sm absolute left-8 whitespace-nowrap"
                                initial={{opacity: 0, x: -10}}
                                animate={{opacity: open ? 1 : 0, x: open ? 0 : -10}}
                                transition={{duration: 0.2}}
                            >
                                AI Matrix
                            </motion.span>
                        </div>
                        <div className="mt-8 flex flex-col gap-2">
                            {links.map((link, idx) => (
                                <SidebarLink key={idx} link={link}/>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <ThemeSwitcher className="h-6 w-6 text-[--foreground]"/>
                        <SidebarLink
                            link={{
                                label: "Armani Sadeghi",
                                href: "#",
                                icon: (
                                    <User className="h-6 w-6 text-[--foreground]"/>
                                ),
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
            <div className="flex flex-1">
                <div
                    className="p-2 md:p-10 rounded-tl-2xl border border-border bg-card text-card-foreground flex flex-col gap-2 flex-1 w-full h-full"
                >
                    <StoreProvider>
                        {children}
                    </StoreProvider>

                </div>
            </div>
        </div>
    );
}

export default BaseLayout;
