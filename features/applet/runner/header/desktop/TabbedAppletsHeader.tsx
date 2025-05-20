"use client";
import React from "react";
import Link from "next/link";
import { ThemeSwitcherIcon } from "@/styles/themes";
import { HeaderTabGroup } from "../common/HeaderTabs";
import AppSelector from "../common/AppSelector";
import ButtonMenu from "../common/ButtonMenu";
import NavigationMenu from "../navigation-menu/NavigationMenu";
import { HeaderLogic } from "./HeaderLogic";
import { DesktopAppHeaderProps } from "./DesktopAppHeader";

export const TabbedAppletsHeader: React.FC<DesktopAppHeaderProps> = ({ 
    appId, 
    headerClassName,
    isDemo = false,
    activeAppletSlug,
    isCreator,
    isAdmin,
}) => {
    // Use the default header class if no custom className is provided
    const defaultHeaderClass = "sticky top-0 w-full z-40 h-14 bg-white dark:bg-gray-900 transition-colors shadow-sm";
    const finalHeaderClass = headerClassName || defaultHeaderClass;
    
    return (
        <HeaderLogic
            appId={appId}
            isDemo={isDemo}
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
            }) => (
                <header className={finalHeaderClass}>
                    {/* Top Navigation with primary grid */}
                    <div className="grid grid-cols-12 items-center h-full pt-2 pb-2 px-6">
                        {/* Left section - Icon and Tabs (8/12) */}
                        <div className="col-span-12 lg:col-span-8">
                            {/* Nested grid for icon and tabs */}
                            <div className="flex items-center">
                                <div className="shrink-0 mr-4">
                                    <div>
                                        <Link href={`/apps/custom/${config.slug}`}>
                                            {activeAppIcon}
                                        </Link>
                                    </div>
                                </div>
                                {/* Tabs - with overflow handling */}
                                <div className="overflow-x-auto hide-scrollbar flex-grow">
                                    <div className="flex w-full">
                                        <HeaderTabGroup 
                                            appletList={appletList}
                                            activeAppletSlug={activeAppletSlug}
                                            handleAppletChange={handleAppletChange}
                                            preserveTabOrder={true}
                                        />
                                    </div>
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
                            
                            {/* Replace the old user icon/menu with the new NavigationMenu component */}
                            <NavigationMenu />
                        </div>
                    </div>
                </header>
            )}
        </HeaderLogic>
    );
};

export default TabbedAppletsHeader;