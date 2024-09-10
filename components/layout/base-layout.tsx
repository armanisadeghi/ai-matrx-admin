"use client";

import React, {useState} from "react";
import {SidebarLink, SidebarProvider, useSidebar} from "../ui/sidebar";
import {cn} from "@/lib/utils";
import {User} from "lucide-react";
import {AnimatePresence, motion} from "framer-motion";
import {ThemeSwitcher} from "@/components/layout/ThemeSwitcher";
import StoreProvider from "@/app/StoreProvider";
import Link from "next/link";
import {IconMenu2, IconX} from "@tabler/icons-react";

function BaseLayout({children, links}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white dark:bg-black p-4"> {/* Adjust for light/dark mode */}
            <div className={cn(
                "flex h-[calc(100vh-2rem)]", // Subtracting padding from height
                "bg-gray-100 dark:bg-neutral-700 w-full max-w-7xl", // Light gray for light mode, dark gray for dark mode
                "mx-auto rounded-xl overflow-hidden", // Rounded corners
                "border border-gray-300 dark:border-neutral-600" // Border color for light/dark mode
            )}>
                <Sidebar open={open} setOpen={setOpen}>
                    <SidebarBody className="flex flex-col h-full justify-between">
                        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                            {open ? <Logo/> : <LogoIcon/>}
                            <div className="mt-8 flex flex-col gap-2">
                                {links.map((link, idx) => (
                                    <SidebarLink key={idx} link={link}/>
                                ))}
                            </div>
                        </div>
                        <div className="mt-auto pt-4 flex flex-col gap-4">
                            <ThemeSwitcher className="h-6 w-6 text-foreground"/>
                            <SidebarLink
                                link={{
                                    label: "Armani Sadeghi",
                                    href: "#",
                                    icon: (
                                        <User className="h-6 w-6 text-foreground"/>
                                    ),
                                }}
                            />
                        </div>
                    </SidebarBody>
                </Sidebar>
                <div className="flex flex-1 flex-col">
                    <div className={cn(
                        "flex-1 p-6 rounded-tl-2xl",
                        "bg-neutral-400 dark:bg-neutral-900 text-black dark:text-white", // Light background for light mode, dark for dark mode
                        "flex flex-col gap-2"
                    )}>
                        <StoreProvider>
                            {children}
                        </StoreProvider>
                    </div>
                </div>
            </div>
        </div>
    );
}


export const Sidebar = (
    {
        children,
        open,
        setOpen,
        animate,
    }: {
        children: React.ReactNode;
        open?: boolean;
        setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
        animate?: boolean;
    }) => {
    return (
        <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
            {children}
        </SidebarProvider>
    );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
    return (
        <>
            <DesktopSidebar {...props} />
            <MobileSidebar {...(props as unknown as React.ComponentProps<"div">)} />
        </>
    );
};

export const DesktopSidebar = (
    {
        className,
        children,
        ...props
    }: React.ComponentProps<typeof motion.div>) => {
    const {open, setOpen, animate} = useSidebar();
    return (
        <>
            <motion.div
                className={cn(
                    "h-full px-4 py-4 hidden md:flex md:flex-col",
                    "bg-gray-50 dark:bg-neutral-700 w-[300px] flex-shrink-0", // Matches main container background
                    className
                )}
                animate={{
                    width: animate ? (open ? "300px" : "60px") : "300px",
                }}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                {...props}
            >
                {children}
            </motion.div>
        </>
    );
};


export const MobileSidebar = (
    {
        className,
        children,
        ...props
    }: React.ComponentProps<"div">) => {
    const {open, setOpen} = useSidebar();
    return (
        <>
            <div
                className={cn(
                    "h-10 px-4 py-4 flex flex-row md:hidden  items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
                )}
                {...props}
            >
                <div className="flex justify-end z-20 w-full">
                    <IconMenu2
                        className="text-neutral-800 dark:text-neutral-200"
                        onClick={() => setOpen(!open)}
                    />
                </div>
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{x: "-100%", opacity: 0}}
                            animate={{x: 0, opacity: 1}}
                            exit={{x: "-100%", opacity: 0}}
                            transition={{
                                duration: 0.3,
                                ease: "easeInOut",
                            }}
                            className={cn(
                                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                                className
                            )}
                        >
                            <div
                                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
                                onClick={() => setOpen(!open)}
                            >
                                <IconX/>
                            </div>
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};


const InfinitySymbol = ({width = 28, height = 16, className = ''}) => (
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
            <InfinitySymbol className="text-primary"/>
            <motion.span
                initial={{opacity: 0}}
                animate={{opacity: 1}}
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
            <InfinitySymbol className="text-primary"/>
        </Link>
    );
};


export default BaseLayout;
