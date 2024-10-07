"use client";

import Image from "next/image";
import {cn} from "@/lib/utils";
import Link, {LinkProps} from "next/link";
import React, {useState, createContext, useContext} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {IconMenu2, IconX, IconArrowNarrowLeft,} from "@tabler/icons-react";

import {Logo, LogoIcon} from "@/components/layout/MatrixLogo";
import {appSidebarLinks} from "@/constants";
import {Settings, User} from "lucide-react";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/redux/store";
import TablePage from "@/app/(authenticated)/tests/table-test/page";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}


// Dummy dashboard component with content
const Dashboard = () => {
    return (
        <div className="m-2 flex flex-1">
            <div
                className="flex h-full w-full flex-1 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900 md:p-10">
                <div className="flex gap-2">
                    {[...new Array(4)].map((_, i) => (
                        <div
                            key={"first-array" + i}
                            className="h-20 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-neutral-800"
                        ></div>
                    ))}
                </div>
                <div className="flex flex-1 gap-2">
                    {[...new Array(2)].map((_, i) => (
                        <div
                            key={"second-array" + i}
                            className="h-full w-full animate-pulse rounded-lg bg-gray-100 dark:bg-neutral-800"
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
};


export interface LayoutWithSidebarProps {
    primaryLinks?: Links[];
    secondaryLinks?: Links[];
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    children?: React.ReactNode;
}

export function LayoutWithSidebar({primaryLinks, secondaryLinks, open, setOpen, children}: LayoutWithSidebarProps) {
    const user = useSelector((state: RootState) => state.user);
    const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split('@')[0] || "User";
    const profilePhoto = user.userMetadata.picture || null; // Assuming the profile photo URL is stored in avatar_url
    const defaultSecondaryLinks = [
        {
            label: "Settings",
            href: "/use/settings",
            icon: (<Settings className="h-5 w-5 text-foreground"/>),
        },
        {
            label: displayName,
            href: "/dashboard/profile",
            icon: (<User className="h-5 w-5 text-foreground"/>),
        }
    ];

    if (!primaryLinks) primaryLinks = appSidebarLinks;
    if (!secondaryLinks) secondaryLinks = defaultSecondaryLinks;

    return (
        <SidebarLayout
            primaryLinks={primaryLinks}
            secondaryLinks={secondaryLinks}
            open={open}
            setOpen={setOpen}
            userName={displayName}
            userProfilePhoto={profilePhoto}
        >
            <div className="m-1 flex flex-1">
                <div
                    className="flex h-full w-full flex-1 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900 md:p-3">
                    {/*<TablePage/>*/}
                    {children}
                </div>
            </div>
        </SidebarLayout>
    );
}

export interface SidebarLayoutProps {
    className?: string;
    children: React.ReactNode;
    primaryLinks?: Links[];
    secondaryLinks?: Links[];
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    userName: string;
    userProfilePhoto: string | null;
}

export function SidebarLayout(
    {
        className,
        children,
        primaryLinks,
        secondaryLinks,
        open: propOpen,
        setOpen: propSetOpen,
        userName,
        userProfilePhoto,
    }: SidebarLayoutProps) {
    const [internalOpen, setInternalOpen] = useState(true);

    const open = propOpen !== undefined ? propOpen : internalOpen;
    const setOpen = propSetOpen || setInternalOpen;

    return (
        <div
            className={cn(
                "mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800 md:flex-row",
                "h-screen",
                className,
            )}
        >
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide">
                        {open ? <Logo/> : <LogoIcon/>}
                        <div className="mt-8 flex flex-col">
                            {primaryLinks.map((link, idx) => (
                                <SidebarLink key={idx} link={link}/>
                            ))}
                        </div>
                        <div className="mt-4">
                            <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700"></div>
                            <div className="h-px w-full bg-white dark:bg-neutral-900"></div>
                        </div>
                        <div className="mt-4 flex flex-col">
                            {secondaryLinks.map((link, idx) => (
                                <SidebarLink key={idx} link={link}/>
                            ))}
                        </div>
                    </div>
                    <div>
                        <SidebarLink
                            link={{
                                label: userName,
                                href: "#",
                                icon: (
                                    <Image
                                        src={userProfilePhoto || "/happy-robot-avatar.jpg"}
                                        className={cn(
                                            "h-7 w-7 flex-shrink-0 rounded-full",
                                            open ? "h-7 w-7" : "h-5 w-5",
                                        )}
                                        width={50}
                                        height={50}
                                        alt="Avatar"
                                    />
                                ),
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
            {children}
        </div>
    );
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
    undefined,
);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = (
    {
        children,
        open: openProp,
        setOpen: setOpenProp,
    }: {
        children: React.ReactNode;
        open?: boolean;
        setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    }) => {
    const [openState, setOpenState] = useState(false);

    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{open, setOpen}}>
            {children}
        </SidebarContext.Provider>
    );
};

export const Sidebar = (
    {
        children,
        open,
        setOpen,
    }: {
        children: React.ReactNode;
        open?: boolean;
        setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    }) => {
    return (
        <SidebarProvider open={open} setOpen={setOpen}>
            {children}
        </SidebarProvider>
    );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
    return (
        <>
            <DesktopSidebar {...props} />
            <MobileSidebar {...props} />
        </>
    );
};

export const DesktopSidebar = (
    {
        className,
        children,
        ...props
    }: React.ComponentProps<typeof motion.div>) => {
    const {open, setOpen} = useSidebar();
    return (
        <motion.div
            className={cn(
                "group/sidebar-btn relative m-2 hidden h-full w-[300px] flex-shrink-0 rounded-xl bg-white px-4 py-4 dark:bg-neutral-900 md:flex md:flex-col hide-scrollbar",
                open ? "overflow-y-auto scrollbar-hide" : "overflow-hidden",

                className,
            )}
            animate={{
                width: open ? "300px" : "70px",
            }}
            {...props}
        >
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "absolute -right-2 top-4 z-40 hidden h-5 w-5 transform items-center justify-center rounded-sm border border-neutral-200 bg-white transition duration-200 group-hover/sidebar-btn:flex dark:border-neutral-700 dark:bg-neutral-900",
                    open ? "rotate-0" : "rotate-180",
                )}
            >
                <IconArrowNarrowLeft className="text-black dark:text-white"/>
            </button>
            {children as React.ReactNode}
        </motion.div>
    );
};

export const MobileSidebar = (
    {
        className,
        children,
        ...props
    }: React.ComponentProps<typeof motion.div>) => {
    const {open, setOpen} = useSidebar();
    return (
        <motion.div
            className={cn(
                "flex h-10 w-full flex-row items-center justify-between bg-neutral-100 px-4 py-4 dark:bg-neutral-800 md:hidden",
            )}
            {...props}
        >
            <div className="z-20 flex w-full justify-end">
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
                            "fixed inset-0 z-[100] flex h-full w-full flex-col justify-between bg-white p-10 dark:bg-neutral-900",
                            className,
                        )}
                    >
                        <div
                            className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
                            onClick={() => setOpen(!open)}
                        >
                            <IconX/>
                        </div>
                        {children as React.ReactNode}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export const SidebarLink = (
    {
        link,
        className,
        ...props
    }: {
        link: Links;
        className?: string;
        props?: LinkProps;
    }) => {
    const {open} = useSidebar();
    return (
        <Link
            href={link.href}
            className={cn(
                "group/sidebar flex items-center justify-start gap-2 rounded-sm px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700",
                className,
            )}
            {...props}
        >
            {link.icon}

            <motion.span
                animate={{
                    display: open ? "inline-block" : "none",
                    opacity: open ? 1 : 0,
                }}
                className="!m-0 inline-block whitespace-pre !p-0 text-sm text-neutral-700 transition duration-150 dark:text-neutral-200"
            >
                {link.label}
            </motion.span>
        </Link>
    );
};
