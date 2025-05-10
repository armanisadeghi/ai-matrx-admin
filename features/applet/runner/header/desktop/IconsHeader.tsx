"use client";
import React from "react";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcherIcon } from "@/styles/themes";
import AppSelector from "../common/AppSelector";
import ButtonMenu from "../common/ButtonMenu";
import { CustomAppHeaderProps } from "../CustomAppHeader";
import { HeaderLogic } from "./HeaderLogic";

export const IconsHeader: React.FC<CustomAppHeaderProps> = ({ 
    appId, 
    headerClassName,
    isDemo = false,
    activeAppletId = ''
}) => {
    const defaultHeaderClass = "sticky top-0 w-full z-40 h-14 bg-white dark:bg-gray-900 transition-colors shadow-sm";
    const finalHeaderClass = headerClassName || defaultHeaderClass;
    
    return (
        <HeaderLogic
            appId={appId}
            isDemo={isDemo}
            activeAppletId={activeAppletId}
        >
            {({
                activeAppIcon,
                appletList,
                extraButtons,
                config,
                displayName,
                profilePhoto,
                activeAppletId: activeId,
                handleTabChange,
                isDemo: isDemoMode
            }) => {
                return (
                    <header className={finalHeaderClass}>
                        <div className="grid grid-cols-12 items-center h-full pt-2 pb-2 px-6">
                            {/* Left section - Main Icon and App Icons (8/12) */}
                            <div className="col-span-12 lg:col-span-8">
                                <div className="flex items-center">
                                    <div className="shrink-0 mr-4">
                                        <Link href={`/apps/custom/${config.slug}`}>
                                            {activeAppIcon}
                                        </Link>
                                    </div>
                                    
                                    {/* App icons in a row */}
                                    <div className="flex items-center space-x-4 overflow-x-auto hide-scrollbar">
                                        {appletList.map((applet) => (
                                            <div 
                                                key={applet.value}
                                                className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-colors
                                                    ${activeId === applet.value 
                                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                    }`}
                                                onClick={() => handleTabChange(applet.value)}
                                                title={applet.label}
                                            >
                                                {/* Simple letter icon (first letter of label) */}
                                                {applet.label.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                    </div>
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

export default IconsHeader;