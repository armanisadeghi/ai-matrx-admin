// components/Header.tsx
"use client";

import React from "react";
import { Menu, LayoutPanelLeft, Sun, Moon, MessageSquare, Mail, Bell, Settings, HelpCircle, User, TreePalm } from "lucide-react";
import { useAppletData } from "@/context/AppletDataContext";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux";
import { ThemeSwitcherIcon } from "@/styles/themes";
import Image from "next/image";
import { HeaderTabGroup } from "./HeaderTabs";
import Link from "next/link";
import { CustomAppHeaderProps } from "./CustomAppHeader";
import HeaderExtraButtons from "./HeaderButtons";
import { LuBrain } from "react-icons/lu";
import { GiArtificialIntelligence } from "react-icons/gi";
import { FaBrain } from "react-icons/fa";

export const APP_ICON_OPTIONS = {
    LayoutPanelLeft: LayoutPanelLeft,
    Menu: Menu,
    Sun: Sun,
    Moon: Moon,
    User: User,
    Settings: Settings,
    HelpCircle: HelpCircle,
    Mail: Mail,
    MessageSquare: MessageSquare,
    TreePalm: TreePalm,
    LuBrain: LuBrain,
    GiArtificialIntelligence: GiArtificialIntelligence,
    FaBrain: FaBrain,
};

export const APP_ICON_CLASSNAMES = {
    Rose: "text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700",
    Blue: "text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500",
    Gray: "text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-500",
    Green: "text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-500",
    Purple: "text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-500",
    Yellow: "text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-500",
    Red: "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500",
    Orange: "text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-500",
    Pink: "text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-500",
    slate: "text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-500",
    zinc: "text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-500",
    neutral: "text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-500",
    stone: "text-stone-500 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-500",
    amber: "text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-500",
    lime: "text-lime-500 dark:text-lime-400 hover:text-lime-600 dark:hover:text-lime-500",
    emerald: "text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-500",
    teal: "text-teal-500 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-500",
    cyan: "text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-500",
    sky: "text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-500",
    violet: "text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-500",
    purple: "text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-500",
    fuchsia: "text-fuchsia-500 dark:text-fuchsia-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-500",
};

export const DesktopAppHeader = ({ config }: CustomAppHeaderProps) => {
    const { activeTab, setActiveTab } = useAppletData();

    const user = useSelector((state: RootState) => state.user);
    const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split("@")[0] || "User";
    const profilePhoto = user.userMetadata.picture || null;

    const AppIcon = APP_ICON_OPTIONS[config.icon] || LayoutPanelLeft;
    const AppIconClassName =
        APP_ICON_CLASSNAMES[config.accentColor] || "text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700";


    return (
        <header className="sticky top-0 w-full z-40 h-14 bg-white dark:bg-gray-900 transition-colors shadow-sm">
            {/* Top Navigation with primary grid */}
            <div className="grid grid-cols-12 items-center h-full pt-2 pb-2 px-6">
                {/* Left section - Icon and Tabs (8/12) */}
                <div className="col-span-12 lg:col-span-8">
                    {/* Nested grid for icon and tabs */}
                    <div className="flex items-center">
                        <div className="shrink-0 mr-4">
                            <div>
                                <Link href="/applets">
                                    <AppIcon size={28} className={AppIconClassName} />
                                </Link>
                            </div>
                        </div>

                        {/* Tabs - with overflow handling */}
                        <div className="overflow-x-auto hide-scrollbar flex-grow">
                            <div className="flex w-full">
                                <HeaderTabGroup 
                                    appletList={config.appletList} 
                                    activeTab={activeTab} 
                                    setActiveTab={setActiveTab}
                                    preserveTabOrder={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right section - Buttons and profile (4/12) */}
                <div className="col-span-12 lg:col-span-4 flex items-center justify-end gap-2 shrink-0 mt-2 lg:mt-0">
                    <HeaderExtraButtons buttons={config.extraButtons} />
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
};

export default DesktopAppHeader;
