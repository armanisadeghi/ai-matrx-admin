"use client";

import React, { useState, useEffect } from "react";
// Statically import commonly used Lucide icons to reduce bundle size
import {
    Zap,
    Home,
    User,
    Settings,
    Search,
    Bell,
    Menu,
    X,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    Edit,
    Trash,
    Check,
    AlertCircle,
    Info,
    HelpCircle,
    Eye,
    EyeOff,
    Copy,
    Download,
    Upload,
    Save,
    MoreVertical,
    MoreHorizontal,
    Filter,
    SortAsc,
    SortDesc,
    Calendar,
    Clock,
    Mail,
    Phone,
    MapPin,
    Link,
    ExternalLink,
    File,
    Folder,
    Image,
    Video,
    Music,
    FileText,
    Database,
    Cloud,
    Server,
    Code,
    Terminal,
    Globe,
    Lock,
    Unlock,
    Shield,
    Key,
    LogIn,
    LogOut,
    UserPlus,
    Users,
    Star,
    Heart,
    Bookmark,
    Share,
    Send,
    MessageSquare,
    MessageCircle,
    Hash,
    AtSign,
    Paperclip,
    Mic,
    Volume2,
    Play,
    Pause,
    SkipForward,
    SkipBack,
    RefreshCw,
    RotateCw,
    Loader,
    Loader2,
    Circle,
    Square,
    Triangle,
    Hexagon,
    Package,
    Box,
    Archive,
    Inbox,
    Layers,
    Layout,
    Grid,
    List,
    Columns,
    Sidebar,
    Maximize,
    Minimize,
    ZoomIn,
    ZoomOut,
    Move,
    Scissors,
    Clipboard,
    PieChart,
    BarChart,
    TrendingUp,
    TrendingDown,
    Activity,
    Cpu,
    HardDrive,
    Wifi,
    WifiOff,
    Bluetooth,
    Battery,
    BatteryCharging,
    Power,
    Sun,
    Moon,
    CloudRain,
    Droplet,
    Wind,
    Tag,
    Tags,
    Flag,
    Award,
    Gift,
    ShoppingCart,
    CreditCard,
    DollarSign,
    Percent,
    Target,
    Crosshair,
    Navigation,
    Compass,
    Map,
    Smile,
    Frown,
    Meh,
    ThumbsUp,
    ThumbsDown,
} from "lucide-react";
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

// Statically imported Lucide icons map (commonly used icons for optimal bundle size)
const staticLucideIconMap: Record<string, any> = {
    Zap,
    Home,
    User,
    Settings,
    Search,
    Bell,
    Menu,
    X,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    Edit,
    Trash,
    Check,
    AlertCircle,
    Info,
    HelpCircle,
    Eye,
    EyeOff,
    Copy,
    Download,
    Upload,
    Save,
    MoreVertical,
    MoreHorizontal,
    Filter,
    SortAsc,
    SortDesc,
    Calendar,
    Clock,
    Mail,
    Phone,
    MapPin,
    Link,
    ExternalLink,
    File,
    Folder,
    Image,
    Video,
    Music,
    FileText,
    Database,
    Cloud,
    Server,
    Code,
    Terminal,
    Globe,
    Lock,
    Unlock,
    Shield,
    Key,
    LogIn,
    LogOut,
    UserPlus,
    Users,
    Star,
    Heart,
    Bookmark,
    Share,
    Send,
    MessageSquare,
    MessageCircle,
    Hash,
    AtSign,
    Paperclip,
    Mic,
    Volume2,
    Play,
    Pause,
    SkipForward,
    SkipBack,
    RefreshCw,
    RotateCw,
    Loader,
    Loader2,
    Circle,
    Square,
    Triangle,
    Hexagon,
    Package,
    Box,
    Archive,
    Inbox,
    Layers,
    Layout,
    Grid,
    List,
    Columns,
    Sidebar,
    Maximize,
    Minimize,
    ZoomIn,
    ZoomOut,
    Move,
    Scissors,
    Clipboard,
    PieChart,
    BarChart,
    TrendingUp,
    TrendingDown,
    Activity,
    Cpu,
    HardDrive,
    Wifi,
    WifiOff,
    Bluetooth,
    Battery,
    BatteryCharging,
    Power,
    Sun,
    Moon,
    CloudRain,
    Droplet,
    Wind,
    Tag,
    Tags,
    Flag,
    Award,
    Gift,
    ShoppingCart,
    CreditCard,
    DollarSign,
    Percent,
    Target,
    Crosshair,
    Navigation,
    Compass,
    Map,
    Smile,
    Frown,
    Meh,
    ThumbsUp,
    ThumbsDown,
};

// Custom icons map for manually imported icons (react-icons)
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

// Cache for dynamically loaded icons to prevent re-importing
const dynamicIconCache: Record<string, any> = {};

/**
 * HOW TO ADD MORE STATIC ICONS:
 * 
 * If you find yourself frequently using an icon that's not in the static map,
 * add it to optimize bundle size:
 * 
 * 1. Import it at the top:
 *    import { YourIcon } from "lucide-react";
 * 
 * 2. Add it to staticLucideIconMap:
 *    const staticLucideIconMap = {
 *      ...existing icons,
 *      YourIcon,
 *    };
 * 
 * This way it will be included in the initial bundle and won't need dynamic loading.
 */

interface IconResolverProps {
    iconName: string | null;
    className?: string;
    size?: number;
    fallbackIcon?: string;
}

/**
 * IconResolver - A unified component for resolving and rendering icons by name
 * Uses hybrid approach: static imports for common icons, dynamic imports for others
 * Supports all lucide-react icons and custom manually imported icons
 */
const IconResolver: React.FC<IconResolverProps> = ({ 
    iconName, 
    className = "h-4 w-4", 
    size,
    fallbackIcon = "Zap" 
}) => {
    const [DynamicIcon, setDynamicIcon] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadIcon = async () => {
            if (!iconName) {
                setDynamicIcon(null);
                return;
            }

            // Check custom icons first
            if (customIconMap[iconName]) {
                setDynamicIcon(() => customIconMap[iconName]);
                return;
            }

            // Check statically imported Lucide icons
            if (staticLucideIconMap[iconName]) {
                setDynamicIcon(() => staticLucideIconMap[iconName]);
                return;
            }

            // Check if already cached
            if (dynamicIconCache[iconName]) {
                setDynamicIcon(() => dynamicIconCache[iconName]);
                return;
            }

            // Dynamically import from lucide-react
            setIsLoading(true);
            try {
                const iconModule = await import("lucide-react");
                const IconComponent = iconModule[iconName as keyof typeof iconModule];
                
                if (IconComponent) {
                    dynamicIconCache[iconName] = IconComponent;
                    setDynamicIcon(() => IconComponent);
                } else {
                    // Icon not found, use fallback
                    setDynamicIcon(() => staticLucideIconMap[fallbackIcon] || Zap);
                }
            } catch (error) {
                console.warn(`Failed to load icon: ${iconName}`, error);
                setDynamicIcon(() => staticLucideIconMap[fallbackIcon] || Zap);
            } finally {
                setIsLoading(false);
            }
        };

        loadIcon();
    }, [iconName, fallbackIcon]);

    // Get the icon component to render
    const IconComponent = DynamicIcon || staticLucideIconMap[fallbackIcon] || Zap;

    // Show fallback while loading dynamic icons (seamless experience)
    if (isLoading && !DynamicIcon) {
        const FallbackIcon = staticLucideIconMap[fallbackIcon] || Zap;
        return <FallbackIcon className={className} size={size} />;
    }

    return <IconComponent className={className} size={size} />;
};

export default IconResolver;

/**
 * Synchronous utility function for getting icon components directly
 * Only works with statically imported icons (custom + common Lucide icons)
 * For dynamic Lucide icons not in the static map, use the IconResolver component instead
 */
export const getIconComponent = (iconName: string | null, fallbackIcon: string = "Zap") => {
    if (!iconName) {
        return staticLucideIconMap[fallbackIcon] || Zap;
    }

    // First check custom icons
    if (customIconMap[iconName]) {
        return customIconMap[iconName];
    }

    // Then check statically imported Lucide icons
    if (staticLucideIconMap[iconName]) {
        return staticLucideIconMap[iconName];
    }

    // Check dynamic cache
    if (dynamicIconCache[iconName]) {
        return dynamicIconCache[iconName];
    }

    // Fallback to default icon
    return staticLucideIconMap[fallbackIcon] || Zap;
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

/**
 * Utility function for rendering an icon with color and size
 * Note: This is synchronous and only works with statically imported icons
 * For dynamic icons, use the DynamicIcon component instead
 */
export const getIconWithColorAndSize = (iconName: string | null, color: string = "gray", size: number = 4) => {
    const IconComponent = getIconComponent(iconName);
    const colorClass = getTextColorClass(color);
    return <IconComponent className={`h-${size} w-${size} ${colorClass}`} />;
};

/**
 * Simple Icon component for direct usage with color and size support
 * Uses IconResolver internally to support both static and dynamic icons
 */
interface IconProps {
    name: string | null;
    color?: string;
    size?: number;
    className?: string;
    fallbackIcon?: string;
}

export const DynamicIcon: React.FC<IconProps> = ({ 
    name, 
    color = "gray", 
    size = 4, 
    className,
    fallbackIcon = "Zap"
}) => {
    const colorClass = getTextColorClass(color);
    const sizeClass = `h-${size} w-${size}`;
    const combinedClassName = `${sizeClass} ${colorClass} ${className || ""}`.trim();
    
    return <IconResolver iconName={name} className={combinedClassName} fallbackIcon={fallbackIcon} />;
};




