"use client";
import React, { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { ThemeSwitcherIcon } from "@/styles/themes/ThemeSwitcher";
import { NavigationMenu } from "@/features/applet/runner/header/navigation-menu/NavigationMenu";
import { BACKGROUND_PATTERN } from "@/constants/chat";
import { NotificationDropdown } from "@/components/ui/notifications";
import { Notification } from "@/types/notification.types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarLink {
    label: string;
    href: string;
    icon: React.ReactNode;
}

interface DesktopLayoutProps {
    children: React.ReactNode;
    primaryLinks: SidebarLink[];
    secondaryLinks?: SidebarLink[];
    initialOpen?: boolean;
    uniqueId?: string;
    isAdmin?: boolean;
}


export default function DesktopLayout({
    children,
    primaryLinks,
    secondaryLinks = [],
    initialOpen = false,
    uniqueId = "desktop-layout",
    isAdmin = false,
}: DesktopLayoutProps) {
    const pathname = usePathname();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(!initialOpen);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const isAdminIndicatorVisible = useAppSelector((state) => selectIsOverlayOpen(state, "adminIndicator"));
    
    const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
    const allLinks = [...primaryLinks, ...(isAdmin ? secondaryLinks : [])];
    
    // Only show secondary links if admin indicator is visible
    const shouldShowSecondaryLinks = isAdmin && isAdminIndicatorVisible;

    // Helper function to check if a link is active based on the current pathname
    const isLinkActive = (linkHref: string) => {
        // Remove trailing slash from both pathname and linkHref for consistent comparison
        const normalizedPathname = pathname.endsWith('/') && pathname.length > 1 
            ? pathname.slice(0, -1) 
            : pathname;
        const normalizedHref = linkHref.endsWith('/') && linkHref.length > 1 
            ? linkHref.slice(0, -1) 
            : linkHref;
        
        // Check if the current pathname starts with the link href
        return normalizedPathname === normalizedHref || normalizedPathname.startsWith(normalizedHref + '/');
    };

    return (
        <TooltipProvider delayDuration={300} skipDelayDuration={0}>
            <div id={uniqueId} className="min-h-screen bg-textured text-gray-800 dark:text-gray-100"
            >
                {/* Main Header */}
                <header className="fixed top-0 left-0 right-0 z-50 h-10 bg-textured">
                <div className="flex items-center justify-between h-full pl-1 pr-2">
                    {/* Left side - Menu toggle and page-specific content */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={toggleSidebar}
                                    className="p-2 rounded-lg hover:bg-gray-200/80 dark:hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 flex-shrink-0"
                                >
                                    <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300 transition-all duration-200 ease-in-out" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent 
                                side="right" 
                                className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                            >
                                {isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                            </TooltipContent>
                        </Tooltip>

                        {/* Page-specific controls will be inserted here */}
                        <div id="page-specific-header-content" className="flex-1 min-w-0" />
                    </div>
                    {/* Right side - Actions */}
                    <div className="flex items-center gap-1">
                        <NotificationDropdown
                            notifications={notifications}
                            onMarkAsRead={(id) => {
                                setNotifications(prev => 
                                    prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                                );
                            }}
                            onMarkAllAsRead={() => {
                                setNotifications(prev => 
                                    prev.map(n => ({ ...n, isRead: true }))
                                );
                            }}
                            onClearAll={() => {
                                setNotifications([]);
                            }}
                            onNotificationClick={(notification) => {
                                if (notification.link) {
                                    window.location.href = notification.link;
                                }
                            }}
                        />
                        <ThemeSwitcherIcon className="hover:bg-zinc-200 dark:hover:bg-zinc-700 backdrop-blur-sm text-zinc-700 dark:text-zinc-300 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95" />
                        <NavigationMenu />
                    </div>
                </div>
            </header>

            {/* Sidebar */}
            <aside 
                className={`fixed left-0 top-10 bottom-0 ${isSidebarCollapsed ? "w-11" : "w-64"} bg-zinc-100 dark:bg-zinc-850 transition-all duration-300 z-40 overflow-hidden ${
                    isSidebarCollapsed ? "cursor-ew-resize" : ""
                }`}
                style={{ backgroundImage: BACKGROUND_PATTERN }}
                onClick={(e) => {
                    // When collapsed, clicking anywhere except on interactive elements should expand
                    if (isSidebarCollapsed) {
                        const target = e.target as HTMLElement;
                        // Check if the click target itself is an interactive element or contains one that was actually clicked
                        const isLink = target.tagName === 'A' || target.closest('a') === target;
                        const isButton = target.tagName === 'BUTTON';
                        const isInput = target.tagName === 'INPUT';
                        
                        // If not clicking on an interactive element, expand the sidebar
                        if (!isLink && !isButton && !isInput) {
                            toggleSidebar();
                        }
                    }
                }}
            >
                <nav 
                    className="px-1 h-full flex flex-col"
                >
                    {/* Primary Links */}
                    {primaryLinks.length > 0 && (
                        <div 
                            className={`mb-2 flex-shrink-0 ${
                                isSidebarCollapsed ? "cursor-ew-resize" : ""
                            }`}
                            onClick={(e) => {
                                if (isSidebarCollapsed) {
                                    const target = e.target as HTMLElement;
                                    const isLink = target.tagName === 'A' || target.closest('a') === target;
                                    const isButton = target.tagName === 'BUTTON';
                                    const isInput = target.tagName === 'INPUT';
                                    
                                    if (!isLink && !isButton && !isInput) {
                                        toggleSidebar();
                                    }
                                }
                            }}
                        >
                            <ul className="space-y-1">
                                {primaryLinks.map((link, index) => (
                                    <li key={`primary-${index}`}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <a
                                                    href={link.href}
                                                    className={`relative flex items-center px-2 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] ${
                                                        isLinkActive(link.href)
                                                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm"
                                                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm"
                                                    }`}
                                                >
                                                    <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center [&>svg]:!text-current">
                                                        {link.icon}
                                                    </div>
                                                    <span 
                                                        className={`absolute left-9 text-xs whitespace-nowrap transition-all duration-300 ease-in-out ${
                                                            isSidebarCollapsed 
                                                                ? "opacity-0 translate-x-2 pointer-events-none" 
                                                                : "opacity-100 translate-x-0"
                                                        }`}
                                                    >
                                                        {link.label}
                                                    </span>
                                                </a>
                                            </TooltipTrigger>
                                            {isSidebarCollapsed && (
                                                <TooltipContent 
                                                    side="right" 
                                                    className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                                                >
                                                    {link.label}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Route-specific content area - Scrollable middle section */}
                    <div 
                        className={`flex-1 min-h-0 overflow-y-auto scrollbar-none mb-2 ${
                            isSidebarCollapsed ? "cursor-ew-resize" : ""
                        }`}
                        onClick={(e) => {
                            if (isSidebarCollapsed) {
                                const target = e.target as HTMLElement;
                                const isLink = target.tagName === 'A' || target.closest('a') === target;
                                const isButton = target.tagName === 'BUTTON';
                                const isInput = target.tagName === 'INPUT';
                                
                                if (!isLink && !isButton && !isInput) {
                                    toggleSidebar();
                                }
                            }
                        }}
                    >
                        <div id="page-specific-sidebar-content" className="h-full" />
                    </div>

                    {/* Secondary Links (Admin) - Only show if admin indicator is visible */}
                    {shouldShowSecondaryLinks && secondaryLinks.length > 0 && (
                        <div 
                            className={`flex-shrink-0 border-t border-gray-300 dark:border-gray-700 pt-2 mb-2 ${
                                isSidebarCollapsed ? "cursor-ew-resize" : ""
                            }`}
                            onClick={(e) => {
                                if (isSidebarCollapsed) {
                                    const target = e.target as HTMLElement;
                                    const isLink = target.tagName === 'A' || target.closest('a') === target;
                                    const isButton = target.tagName === 'BUTTON';
                                    const isInput = target.tagName === 'INPUT';
                                    
                                    if (!isLink && !isButton && !isInput) {
                                        toggleSidebar();
                                    }
                                }
                            }}
                        >
                            <h3 
                                className={`px-1 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-all duration-300 ease-in-out ${
                                    isSidebarCollapsed 
                                        ? "opacity-0 translate-x-2 pointer-events-none" 
                                        : "opacity-100 translate-x-0"
                                }`}
                            >
                                Admin
                            </h3>
                            <ul className="space-y-1">
                                {secondaryLinks.map((link, index) => (
                                    <li key={`secondary-${index}`}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <a
                                                    href={link.href}
                                                    className={`relative flex items-center px-2 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] ${
                                                        isLinkActive(link.href)
                                                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm"
                                                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm"
                                                    }`}
                                                >
                                                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                                        {link.icon}
                                                    </div>
                                                    <span 
                                                        className={`absolute left-9 text-xs whitespace-nowrap transition-all duration-300 ease-in-out ${
                                                            isSidebarCollapsed 
                                                                ? "opacity-0 translate-x-2 pointer-events-none" 
                                                                : "opacity-100 translate-x-0"
                                                        }`}
                                                    >
                                                        {link.label}
                                                    </span>
                                                </a>
                                            </TooltipTrigger>
                                            {isSidebarCollapsed && (
                                                <TooltipContent 
                                                    side="right" 
                                                    className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                                                >
                                                    {link.label}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* User Profile Section - Fixed at bottom */}
                    <div 
                        className={`flex-shrink-0 border-t border-gray-300 dark:border-gray-700 pt-2 ${
                            isSidebarCollapsed ? "cursor-ew-resize" : ""
                        }`}
                        onClick={(e) => {
                            if (isSidebarCollapsed) {
                                const target = e.target as HTMLElement;
                                const isLink = target.tagName === 'A' || target.closest('a') === target;
                                const isButton = target.tagName === 'BUTTON';
                                const isInput = target.tagName === 'INPUT';
                                
                                if (!isLink && !isButton && !isInput) {
                                    toggleSidebar();
                                }
                            }
                        }}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href="/preferences"
                                    className="relative flex items-center px-2 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm"
                                >
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                        U
                                    </div>
                                    <span 
                                        className={`absolute left-9 text-xs whitespace-nowrap transition-all duration-300 ease-in-out ${
                                            isSidebarCollapsed 
                                                ? "opacity-0 translate-x-2 pointer-events-none" 
                                                : "opacity-100 translate-x-0"
                                        }`}
                                    >
                                        User Settings
                                    </span>
                                </Link>
                            </TooltipTrigger>
                            {isSidebarCollapsed && (
                                <TooltipContent 
                                    side="right" 
                                    className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                                >
                                    User Settings
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className={`pt-10 ${isSidebarCollapsed ? "pl-11" : "pl-64"} transition-all duration-300`}>
                {children}
            </main>
        </div>
        </TooltipProvider>
    );
}