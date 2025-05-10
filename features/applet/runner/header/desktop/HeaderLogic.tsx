"use client";
import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux";
import { useRouter } from "next/navigation";
import { 
    selectAppRuntimeConfig,
    selectAppRuntimeExtraButtons,
    selectAppRuntimeMainAppIcon,
    selectAppRuntimePrimaryColor,
    selectAppRuntimeAppletList,
    selectAppRuntimeLayoutType,
    selectAppRuntimeAccentColor
} from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { getAppIcon } from "@/features/applet/styles/StyledComponents";
import { HeaderExtraButtonsConfig } from "../../field-components/types";
import { CustomAppHeaderProps } from "../CustomAppHeader";

export type AppLayoutOptions = "tabbedApplets" | "singleDropdown" | "multiDropdown" | "singleDropdownWithSearch" | "icons";

export interface HeaderLogicProps extends CustomAppHeaderProps {
    children: (props: HeaderUIProps) => React.ReactNode;
}

export interface HeaderUIProps {
    activeAppIcon: React.ReactNode;
    appletList: Array<{value: string; label: string}>;
    extraButtons: HeaderExtraButtonsConfig[] | undefined;
    config: any; // Using any here as the exact type wasn't specified
    primaryColor: string;
    displayName: string;
    profilePhoto: string | null;
    activeAppletId: string;
    handleTabChange: (tabSlug: string) => void;
    isDemo: boolean;
    appId?: string;
}

export const HeaderLogic: React.FC<HeaderLogicProps> = ({ 
    appId, 
    activeAppletId = '',
    isDemo = false,
    children 
}) => {
    const router = useRouter();
    const config = useAppSelector(selectAppRuntimeConfig);
    const extraButtons = useAppSelector(selectAppRuntimeExtraButtons) as HeaderExtraButtonsConfig[] | undefined;
    const iconName = useAppSelector(selectAppRuntimeMainAppIcon);
    const primaryColor = useAppSelector(selectAppRuntimePrimaryColor);
    const accentColor = useAppSelector(selectAppRuntimeAccentColor);
    const appletList = useAppSelector(selectAppRuntimeAppletList) || [];
    const layoutType = useAppSelector(selectAppRuntimeLayoutType) as AppLayoutOptions;
    
    const user = useAppSelector((state: RootState) => state.user);
    const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split("@")[0] || "User";
    const profilePhoto = user.userMetadata.picture || null;
    
    // Generate the app icon using the existing function
    const activeAppIcon = React.useMemo(() => {
        return getAppIcon({
            color: accentColor,
            icon: iconName,
            size: 24,
        });
    }, [primaryColor, iconName]);
    
    // Setup tab navigation function that uses routing instead of state
    const handleTabChange = (tabSlug: string) => {
        if (config?.slug && tabSlug) {
            router.push(`/apps/custom/${config.slug}/${tabSlug}`);
        }
    };

    return children({
        activeAppIcon,
        appletList: appletList.map(app => ({
            value: app.slug,
            label: app.label
        })),
        extraButtons,
        config,
        primaryColor,
        displayName,
        profilePhoto,
        activeAppletId,
        handleTabChange,
        isDemo,
        appId
    });
};

export default HeaderLogic;