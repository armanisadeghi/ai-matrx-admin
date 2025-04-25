"use client";

import Image from "next/image";
import {cn} from "@/lib/utils";
import Link, {LinkProps} from "next/link";
import {usePathname} from 'next/navigation';
import React, {useState, createContext, useContext, useEffect} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {IconMenu2, IconX, IconMaximize, IconMinimize} from "@tabler/icons-react";
import {Logo} from "@/components/layout/MatrixLogo";
import {appSidebarLinks} from "@/constants";
import {Settings, User} from "lucide-react";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/redux/store";
import {ThemeSwitcher} from "@/styles/themes";
import {Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip";
import {CollapseToggleButton} from "./CollapseToggleButton";
import { BACKGROUND_PATTERN } from "@/constants/chat";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}


export interface LayoutWithSidebarProps {
    primaryLinks?: Links[];
    secondaryLinks?: Links[];
    initialOpen?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    children?: React.ReactNode;
}


const FULL_SCREEN_PATHS = [
    "/chat",
]


export function LayoutWithSidebar(
    {
        primaryLinks,
        secondaryLinks,
        children,
        initialOpen = false
    }: LayoutWithSidebarProps) {
    const user = useSelector((state: RootState) => state.user);
    const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split('@')[0] || "User";
    const profilePhoto = user.userMetadata.picture || null;
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

    const [open, setOpen] = useState(initialOpen);
    const [showSidebar, setShowSidebar] = useState(true);
    const pathname = usePathname();

    const isFullScreen = FULL_SCREEN_PATHS.some(path => pathname.startsWith(path));

    return (
        <>
            {showSidebar && !isFullScreen ? (
                <SidebarLayout
                    primaryLinks={primaryLinks}
                    secondaryLinks={secondaryLinks}
                    userName={displayName}
                    userProfilePhoto={profilePhoto}
                    open={open}
                    setOpen={setOpen}
                >
                    <div className="flex flex-1 overflow-hidden relative">
                        <div
                            className="flex h-full w-full flex-1 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-background/80 md:p-1 overflow-y-auto scrollbar-none"
                            style={{ backgroundImage: BACKGROUND_PATTERN }}
                        >
                            {children}
                        </div>
                        <button
                            onClick={() => setShowSidebar(false)}
                            className="absolute bottom-4 right-4 p-2 rounded-full bg-white text-neutral-800 hover:bg-neutral-100 shadow-md dark:bg-zinc-850 dark:text-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-all duration-200 hidden md:flex"
                            title="Expand to full width"
                            style={{ backgroundImage: BACKGROUND_PATTERN }}
                        >
                            <IconMaximize className="h-5 w-5" />
                        </button>
                    </div>
                </SidebarLayout>
            ) : (
                <div className="h-screen w-full bg-white dark:bg-background flex overflow-hidden">
                    <div className="flex flex-1 flex-col w-full h-full overflow-y-auto scrollbar-none">
                        {children}
                        <button
                            onClick={() => setShowSidebar(true)}
                            className="fixed bottom-4 right-4 p-2 rounded-full bg-white text-neutral-800 hover:bg-neutral-100 shadow-md dark:bg-zinc-850 dark:text-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-all duration-200 hidden md:flex"
                            title="Return to sidebar layout"
                            style={{ backgroundImage: BACKGROUND_PATTERN }}
                        >
                            <IconMinimize className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export interface SidebarLayoutProps {
    className?: string;
    children: React.ReactNode;
    primaryLinks?: Links[];
    secondaryLinks?: Links[];
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    userName: string;
    userProfilePhoto: string | null;
}

export function SidebarLayout(
    {
        className,
        children,
        primaryLinks,
        secondaryLinks,
        open,
        setOpen,
        userName,
        userProfilePhoto,
    }: SidebarLayoutProps) {
    return (
        <div
            className={cn(
                "mx-auto flex w-full max-w-[120rem] flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800 md:flex-row",
                "h-screen",
                className,
            )}
        >
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide">
                        <Logo open={open}/>
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
                        <ThemeSwitcher open={open}/>
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

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

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
    const [openState, setOpenState] = useState(openProp || false);
    const pathname = usePathname();

    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    // Close sidebar on route changes only on mobile
    useEffect(() => {
        if (window.innerWidth < 768) {
        setOpen(false);
        }
    }, [pathname, setOpen]);

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
                "group/sidebar-btn relative m-2 hidden h-full w-[235px] flex-shrink-0 rounded-xl bg-white px-4 py-4 dark:bg-neutral-900 md:flex md:flex-col hide-scrollbar",
                open ? "overflow-y-auto scrollbar-hide" : "overflow-hidden",

                className,
            )}
            animate={{
                width: open ? "235px" : "70px",
            }}
            {...props}
        >
            <CollapseToggleButton
                isOpen={open}
                onToggle={() => setOpen(!open)}
            />
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

export const SidebarLink: React.FC<{
    link: Links;
    className?: string;
    props?: LinkProps;
}> = ({link, className, ...props}) => {
    const {open} = useSidebar();
    const pathname = usePathname();
    const isActive = pathname === link.href;

    const linkContent = (
        <>
            {link.icon}
            <motion.span
                animate={{
                    display: open ? "inline-block" : "none",
                    opacity: open ? 1 : 0,
                }}
                className={cn(
                    "!m-0 inline-block whitespace-pre !p-0 text-sm",
                    "text-neutral-700 dark:text-neutral-200",
                    "transition duration-150"
                )}
            >
                {link.label}
            </motion.span>
        </>
    );

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href={link.href}
                    className={cn(
                        "group/sidebar flex items-center justify-start gap-2 rounded-sm px-2 py-2",
                        "hover:bg-neutral-100 dark:hover:bg-neutral-700",
                        "transition-colors duration-200 ease-in-out",
                        isActive && "bg-neutral-100 dark:bg-neutral-700",
                        className
                    )}
                    {...props}
                >
                    {linkContent}
                </Link>
            </TooltipTrigger>
            {!open && (
                <TooltipContent side="right">
                    <p>{link.label}</p>
                </TooltipContent>
            )}
        </Tooltip>
    );
};
