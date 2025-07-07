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


export const getTextColorClass = (color?: string) => {
    if (!color) return "text-gray-600 dark:text-gray-400";
    
    const colorMap: Record<string, string> = {
        gray: "text-gray-600 dark:text-gray-400",
        rose: "text-rose-600 dark:text-rose-400",
        blue: "text-blue-600 dark:text-blue-400",
        amber: "text-amber-600 dark:text-amber-400",
        cyan: "text-cyan-600 dark:text-cyan-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
        fuchsia: "text-fuchsia-600 dark:text-fuchsia-400",
        green: "text-green-600 dark:text-green-400",
        indigo: "text-indigo-600 dark:text-indigo-400",
        lime: "text-lime-600 dark:text-lime-400",
        neutral: "text-neutral-600 dark:text-neutral-400",
        orange: "text-orange-600 dark:text-orange-400",
        pink: "text-pink-600 dark:text-pink-400",
        purple: "text-purple-600 dark:text-purple-400",
        red: "text-red-600 dark:text-red-400",
        sky: "text-sky-600 dark:text-sky-400",
        slate: "text-slate-600 dark:text-slate-400",
        stone: "text-stone-600 dark:text-stone-400",
        teal: "text-teal-600 dark:text-teal-400",
        violet: "text-violet-600 dark:text-violet-400",
        yellow: "text-yellow-600 dark:text-yellow-400",
        zinc: "text-zinc-600 dark:text-zinc-400",
    };
    
    return colorMap[color.toLowerCase()] || "text-gray-600 dark:text-gray-400";
};

export const getIconWithColorAndSize = (iconName: string | null, color: string = "gray", size: number = 4) => {
    const IconComponent = getIconComponent(iconName);
    const colorClass = getTextColorClass(color);
    return <IconComponent className={`h-${size} w-${size} ${colorClass}`} />;
};

// Simple Icon component for direct usage
interface IconProps {
    name: string | null;
    color?: string;
    size?: number;
    className?: string;
}

export const DynamicIcon: React.FC<IconProps> = ({ name, color = "gray", size = 4, className }) => {
    const IconComponent = getIconComponent(name);
    const colorClass = getTextColorClass(color);
    const sizeClass = `h-${size} w-${size}`;
    
    return <IconComponent className={`${sizeClass} ${colorClass} ${className || ""}`} />;
};




