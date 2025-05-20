"use client";
import React from "react";
import { Menu, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcherIcon } from "@/styles/themes";
import AppSelector from "../common/AppSelector";
import ButtonMenu from "../common/ButtonMenu";
import { DesktopAppHeaderProps } from "./DesktopAppHeader";
import { HeaderLogic } from "./HeaderLogic";

export const MultiDropdownHeader: React.FC<DesktopAppHeaderProps> = ({ 
    appId, 
    headerClassName,
    isDemo = false,
    activeAppletSlug = '',
    isCreator,
    isAdmin,
}) => {
    const defaultHeaderClass = "sticky top-0 w-full z-40 h-14 bg-white dark:bg-gray-900 transition-colors shadow-sm";
    const finalHeaderClass = headerClassName || defaultHeaderClass;
    
    return (
        <HeaderLogic
            appId={appId}
            isDemo={isDemo}
            activeAppletSlug={activeAppletSlug}
        >
            {({
                activeAppIcon,
                appletList,
                extraButtons,
                config,
                displayName,
                profilePhoto,
                activeAppletSlug,
                handleAppletChange,
                isDemo: isDemoMode
            }) => {
                // Group applets by category (simplified example)
                const groupedApplets = {
                    "Main": appletList.slice(0, Math.ceil(appletList.length / 2)),
                    "Other": appletList.slice(Math.ceil(appletList.length / 2))
                };
                
                // Find the active applet from the list
                const activeApplet = appletList.find(applet => applet.slug === activeAppletSlug);
                
                return (
                    <header className={finalHeaderClass}>
                        <div className="grid grid-cols-12 items-center h-full pt-2 pb-2 px-6">
                            {/* Left section - Icon and Multi-dropdown (8/12) */}
                            <div className="col-span-12 lg:col-span-8">
                                <div className="flex items-center">
                                    <div className="shrink-0 mr-4">
                                        <Link href={`/apps/custom/${config.slug}`}>
                                            {activeAppIcon}
                                        </Link>
                                    </div>
                                    
                                    {/* Active applet selector */}
                                    <div className="relative inline-block mr-2">
                                        <button 
                                            className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="mr-2">{activeApplet?.label || 'Select Applet'}</span>
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                    
                                    {/* Category dropdowns */}
                                    {Object.keys(groupedApplets).map((category, index) => (
                                        <div key={category} className="relative inline-block ml-2">
                                            <button 
                                                className="flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                <span className="mr-1">{category}</span>
                                                <ChevronDown size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Right section - Buttons and profile (4/12) */}
                            <div className="col-span-12 lg:col-span-4 flex items-center justify-end gap-2 shrink-0 mt-2 lg:mt-0">
                                {extraButtons && extraButtons.length > 0 && (
                                    <ButtonMenu buttons={extraButtons} />
                                )}
                                {(isDemoMode || !appId) && (
                                    <AppSelector />
                                )}
                                <ThemeSwitcherIcon className="hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200" />
                                <div className="flex items-center rounded-full pl-2 pr-1 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-pointer">
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
                    </header>
                );
            }}
        </HeaderLogic>
    );
};

export default MultiDropdownHeader;