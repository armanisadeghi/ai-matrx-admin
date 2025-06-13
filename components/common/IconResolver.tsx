"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import { 
    FcGoogle,
    FcBrokenLink,
    FcFilm,
    FcDownload,
    FcBiotech,
    FcElectronics,
    FcGraduationCap,
    FcLibrary,
    FcMusic,
    FcParallelTasks,
    FcSalesPerformance,
    FcCalendar,
    FcDocument,
    FcEngineering,
    FcDataProtection,
    FcAssistant,
    FcSms,
    FcTodoList,
    FcWikipedia,
    FcCommandLine,
    FcConferenceCall,
    FcManager,
    FcAreaChart,
    FcMultipleInputs,
    FcShipped,
    FcBusinessContact,
    FcAlphabeticalSortingAz,
    FcAlphabeticalSortingZa,
    FcFeedback,
    FcSignature,
    FcBusiness,
} from "react-icons/fc";
import { FaBrave } from "react-icons/fa6";


// Custom icons map for manually imported icons
const customIconMap: Record<string, any> = {
    FaBrave,
    FcGoogle,
    FcBrokenLink,
    FcFilm,
    FcDownload,
    FcBiotech,
    FcElectronics,
    FcGraduationCap,
    FcLibrary,
    FcMusic,
    FcParallelTasks,
    FcSalesPerformance,
    FcCalendar,
    FcDocument,
    FcEngineering,
    FcDataProtection,
    FcAssistant,
    FcSms,
    FcTodoList,
    FcWikipedia,
    FcCommandLine,
    FcConferenceCall,
    FcManager,
    FcAreaChart,
    FcMultipleInputs,
    FcShipped,
    FcBusinessContact,
    FcAlphabeticalSortingAz,
    FcAlphabeticalSortingZa,
    FcFeedback,
    FcBusiness,
    FcSignature,
};

interface IconResolverProps {
    iconName: string | null;
    className?: string;
    size?: number;
    fallbackIcon?: keyof typeof LucideIcons;
}

/**
 * IconResolver - A unified component for resolving and rendering icons by name
 * Supports all lucide-react icons dynamically and custom manually imported icons
 */
const IconResolver: React.FC<IconResolverProps> = ({ 
    iconName, 
    className = "h-4 w-4", 
    size,
    fallbackIcon = "Zap" 
}) => {
    const resolveIcon = (name: string | null) => {
        if (!name) {
            return LucideIcons[fallbackIcon];
        }

        // First check custom icons
        if (customIconMap[name]) {
            return customIconMap[name];
        }

        // Then check lucide icons
        if (LucideIcons[name as keyof typeof LucideIcons]) {
            return LucideIcons[name as keyof typeof LucideIcons];
        }

        // Fallback to default icon
        return LucideIcons[fallbackIcon];
    };

    const IconComponent = resolveIcon(iconName);

    if (!IconComponent) {
        return <LucideIcons.Zap className={className} size={size} />;
    }

    return <IconComponent className={className} size={size} />;
};

export default IconResolver;

// Export a utility function for getting icon components directly
export const getIconComponent = (iconName: string | null, fallbackIcon: keyof typeof LucideIcons = "Zap") => {
    if (!iconName) {
        return LucideIcons[fallbackIcon];
    }

    // First check custom icons
    if (customIconMap[iconName]) {
        return customIconMap[iconName];
    }

    // Then check lucide icons
    if (LucideIcons[iconName as keyof typeof LucideIcons]) {
        return LucideIcons[iconName as keyof typeof LucideIcons];
    }

    // Fallback to default icon
    return LucideIcons[fallbackIcon];
}; 