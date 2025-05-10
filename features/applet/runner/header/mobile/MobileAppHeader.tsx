// components/AppletHeader/MobileAppHeader.tsx
"use client";
import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux";
import { ThemeSwitcherIcon } from "@/styles/themes";
import Image from "next/image";
import Link from "next/link";
import { CustomAppHeaderProps } from "../CustomAppHeader";
import MobileTabHeader from "./MobileTabHeader ";
import AppSelector from "../common/AppSelector";
import ButtonMenu from "../common/ButtonMenu";
import { useRouter } from "next/navigation";
import {
    selectAppRuntimeConfig,
    selectAppRuntimeExtraButtons,
    selectAppRuntimeMainAppIcon,
    selectAppRuntimeAppletList,
} from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { getAppIcon } from "@/features/applet/styles/StyledComponents";
import { HeaderExtraButtonsConfig } from "../../field-components/types";

export const MobileAppHeader = ({ appId, activeAppletId, isDemo = false }: CustomAppHeaderProps) => {
    const router = useRouter();
    const user = useAppSelector((state: RootState) => state.user);
    const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split("@")[0] || "User";
    const profilePhoto = user.userMetadata.picture || null;

    const config = useAppSelector(selectAppRuntimeConfig);
    const extraButtons = useAppSelector(selectAppRuntimeExtraButtons) as HeaderExtraButtonsConfig[] | undefined;
    const iconName = useAppSelector(selectAppRuntimeMainAppIcon);
    const appletList = useAppSelector(selectAppRuntimeAppletList) || [];

    // Generate the app icon using the existing function
    const activeAppIcon = React.useMemo(() => {
        return getAppIcon({
            color: config?.primaryColor,
            icon: iconName,
            size: 24,
        });
    }, [config?.primaryColor, iconName]);

    // Setup tab navigation function that uses routing instead of state
    const handleTabChange = (tabSlug: string) => {
        if (config?.slug && tabSlug) {
            router.push(`/apps/custom/${config.slug}/${tabSlug}`);
        }
    };

    return (
        <div className="w-full bg-white dark:bg-gray-900 transition-colors">
            <div className="flex items-center justify-between p-2">
                {/* Left section - App icon */}
                <div className="shrink-0">
                    <Link href={`/apps/custom/${config.slug}`}>{activeAppIcon}</Link>
                </div>

                {/* Center section - Mobile Tab Header */}
                <div className="flex-1 mx-2">
                    <MobileTabHeader
                        config={appletList.map((app) => ({
                            value: app.slug,
                            label: app.label,
                        }))}
                        activeTab={activeAppletId || ""}
                        setActiveTab={handleTabChange}
                    />
                </div>

                {/* Right section - Theme switcher and profile */}
                <div className="flex items-center gap-1 shrink-0">
                    {extraButtons && extraButtons.length > 0 && <ButtonMenu buttons={extraButtons} />}
                    {(isDemo || !appId) && <AppSelector />}
                    <ThemeSwitcherIcon className="text-gray-800 dark:text-gray-200" />
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                        {profilePhoto ? (
                            <Image src={profilePhoto} width={32} height={32} alt={displayName} className="w-full h-full object-cover" />
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
