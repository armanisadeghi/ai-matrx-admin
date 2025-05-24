"use client";
import React, { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { ThemeSwitcherIcon } from "@/styles/themes/ThemeSwitcher";
import { NavigationMenu } from "@/features/applet/runner/header/navigation-menu/NavigationMenu";
import { Input } from "@/components/ui/input";

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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(!initialOpen);
    const [activeLink, setActiveLink] = useState(primaryLinks[0]?.href || "");
    
    const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
    const allLinks = [...primaryLinks, ...(isAdmin ? secondaryLinks : [])];

    return (
        <div id={uniqueId} className="min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* Transparent Header */}
            <header className="fixed top-0 left-0 right-0 z-50 h-12">
                <div className="flex items-center justify-between h-full px-4">
                    {/* Left side - Menu toggle and search */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 rounded-lg hover:bg-gray-200/80 dark:hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                        >
                            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300 transition-all duration-200 ease-in-out" />
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                            <Input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 w-64 h-6 text-sm bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500"
                            />
                        </div>
                    </div>
                    {/* Right side - Actions */}
                    <div className="flex items-center gap-3">
                        <button className="p-2 rounded-lg hover:bg-gray-200/80 dark:hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 relative">
                            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300 transition-all duration-200 ease-in-out" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <ThemeSwitcherIcon className="hover:bg-gray-200/80 dark:hover:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95" />
                        <NavigationMenu />
                    </div>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`fixed left-0 top-14 bottom-0 ${isSidebarCollapsed ? "w-11" : "w-64"} bg-slate-100 dark:bg-slate-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 overflow-hidden`}>
                <nav className="px-1 h-full flex flex-col">
                    {/* Primary Links */}
                    {primaryLinks.length > 0 && (
                        <div className="mb-2">
                            <ul className="space-y-1">
                                {primaryLinks.map((link, index) => (
                                    <li key={`primary-${index}`}>
                                        <a
                                            href={link.href}
                                            onClick={() => setActiveLink(link.href)}
                                            className={`relative flex items-center px-2 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] ${
                                                activeLink === link.href
                                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm"
                                                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm"
                                            }`}
                                        >
                                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center [&>svg]:!text-current">
                                                {link.icon}
                                            </div>
                                            <span 
                                                className={`absolute left-9 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
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

                    {/* Secondary Links (Admin) - Scrollable */}
                    {isAdmin && secondaryLinks.length > 0 && (
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
                                                onClick={() => setActiveLink(link.href)}
                                                className={`relative flex items-center px-2 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] ${
                                                    activeLink === link.href
                                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm"
                                                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm"
                                                }`}
                                            >
                                                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                                    {link.icon}
                                                </div>
                                                <span 
                                                    className={`absolute left-9 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
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
            <main className={`pt-11 ${isSidebarCollapsed ? "pl-11" : "pl-64"} transition-all duration-300`}>
                {children}
            </main>
        </div>
    );
}