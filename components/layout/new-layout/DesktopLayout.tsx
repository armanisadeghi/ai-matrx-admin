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
        <div id={uniqueId} className="min-h-screen bg-textured text-gray-800 dark:text-gray-100"
        >
            {/* Main Header */}
            <header className="fixed top-0 left-0 right-0 z-50 h-10 bg-textured">
                <div className="flex items-center justify-between h-full pl-1 pr-2">
                    {/* Left side - Menu toggle and page-specific content */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 rounded-lg hover:bg-gray-200/80 dark:hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 flex-shrink-0"
                        >
                            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300 transition-all duration-200 ease-in-out" />
                        </button>

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
            <aside className={`fixed left-0 top-10 bottom-0 ${isSidebarCollapsed ? "w-11" : "w-64"} bg-zinc-100 dark:bg-zinc-850 transition-all duration-300 z-40 overflow-hidden`}
            style={{ backgroundImage: BACKGROUND_PATTERN }}
            >
                <nav className="px-1 h-full flex flex-col">
                    {/* Primary Links */}
                    {primaryLinks.length > 0 && (
                        <div className="mb-2">
                            <ul className="space-y-1">
                                {primaryLinks.map((link, index) => (
                                    <li key={`primary-${index}`}>
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
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Secondary Links (Admin) - Scrollable - Only show if admin indicator is visible */}
                    {shouldShowSecondaryLinks && secondaryLinks.length > 0 && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <h3 
                                className={`px-1 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-all duration-300 ease-in-out ${
                                    isSidebarCollapsed 
                                        ? "opacity-0 translate-x-2 pointer-events-none" 
                                        : "opacity-100 translate-x-0"
                                }`}
                            >
                                Admin
                            </h3>
                            <div className="flex-1 overflow-y-auto scrollbar-none">
                                <ul className="space-y-1 pr-1">
                                    {secondaryLinks.map((link, index) => (
                                        <li key={`secondary-${index}`}>
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
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className={`pt-10 ${isSidebarCollapsed ? "pl-11" : "pl-64"} transition-all duration-300`}>
                {children}
            </main>
        </div>
    );
}