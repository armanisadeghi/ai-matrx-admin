// components/Header.tsx
"use client";

import React from "react";
import { Menu, LayoutPanelLeft } from "lucide-react";
import { useSearchTab } from "@/context/SearchTabContext";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux";
import { ThemeSwitcherIcon } from "@/styles/themes";
import Image from "next/image";
import { TabConfig, HeaderTabGroup } from "./HeaderTabs";
import { ButtonConfig, HeaderButtonGroup } from "./HeaderButtons";
import Link from "next/link";

interface HeaderConfig {
    tabs: TabConfig[];
    buttons: ButtonConfig[];
}

interface AppletHeaderProps {
    config: HeaderConfig;
}

export const DesktopAppletHeader = ({ config }: AppletHeaderProps) => {
    const user = useSelector((state: RootState) => state.user);
    const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split("@")[0] || "User";
    const profilePhoto = user.userMetadata.picture || null;

    const { activeTab, setActiveTab } = useSearchTab();

    return (
        <div className="w-full bg-white dark:bg-gray-900 transition-colors">
            {/* Top Navigation with primary grid */}
            <div className="grid grid-cols-12 items-center pt-2 pb-2 px-6">
                {/* Left section - Icon and Tabs (8/12) */}
                <div className="col-span-12 lg:col-span-8">
                    {/* Nested grid for icon and tabs */}
                    <div className="flex items-center">
                        
                        <div className="shrink-0 mr-4">
                            <div className="text-rose-500 dark:text-rose-400">
                                <Link href="/applets">
                                    <LayoutPanelLeft size={28} className="text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700" />
                                </Link>
                            </div>
                        </div>
                        
                        {/* Tabs - with overflow handling */}
                        <div className="overflow-x-auto hide-scrollbar flex-grow">
                            <div className="flex w-full">
                                <HeaderTabGroup config={config.tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Right section - Buttons and profile (4/12) */}
                <div className="col-span-12 lg:col-span-4 flex items-center justify-end gap-2 shrink-0 mt-2 lg:mt-0">
                    <HeaderButtonGroup buttons={config.buttons} />
                    <ThemeSwitcherIcon className="hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200" />
                    <div className="flex items-center border rounded-full pl-2 pr-1 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 dark:border-gray-700 cursor-pointer">
                        <Menu size={18} className="ml-2 text-gray-600 dark:text-gray-400" />
                        {profilePhoto ? (
                            <div className="w-8 h-8 rounded-full ml-3 overflow-hidden">
                                <Image src={profilePhoto} width={24} height={24} alt={displayName} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 bg-gray-500 dark:bg-gray-600 rounded-full ml-3"></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesktopAppletHeader;
