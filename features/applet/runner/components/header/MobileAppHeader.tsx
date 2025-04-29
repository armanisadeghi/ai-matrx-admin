// components/AppletHeader/MobileAppHeader.tsx
"use client";
import React from "react";
import { useAppletData } from "@/context/AppletDataContext";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux";
import { ThemeSwitcherIcon } from "@/styles/themes";
import Image from "next/image";
import Link from "next/link";
import { CustomAppHeaderProps } from "./CustomAppHeader";
import MobileTabHeader from "./MobileTabHeader ";
import AppSelector from "./AppSelector";
import ButtonMenu from "./ButtonMenu";

export const MobileAppHeader = ({ appName, isDemo = false }: CustomAppHeaderProps) => {
  const user = useSelector((state: RootState) => state.user);
  const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split("@")[0] || "User";
  const profilePhoto = user.userMetadata.picture || null;
  const { activeTab, setActiveTab, customAppConfig: config, activeAppIcon } = useAppletData();
  
  return (
    <div className="w-full bg-white dark:bg-gray-900 transition-colors">
      <div className="flex items-center justify-between p-2">
        {/* Left section - App icon */}
        <div className="shrink-0">
          <Link href="/applets">
            {activeAppIcon}
          </Link>
        </div>
        
        {/* Center section - Mobile Tab Header */}
        <div className="flex-1 mx-2">
          <MobileTabHeader 
            config={config.appletList} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        </div>
        
        {/* Right section - Theme switcher and profile */}
        <div className="flex items-center gap-1 shrink-0">
          {config.extraButtons && config.extraButtons.length > 0 && (
            <ButtonMenu buttons={config.extraButtons} />
          )}
          {(isDemo || !appName) && (
            <AppSelector />
          )}
          <ThemeSwitcherIcon className="text-gray-800 dark:text-gray-200" />
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
            {profilePhoto ? (
              <Image 
                src={profilePhoto} 
                width={32} 
                height={32} 
                alt={displayName} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-gray-500 dark:bg-gray-600 rounded-full"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAppHeader;