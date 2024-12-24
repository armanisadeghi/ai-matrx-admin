'use client';

import React from 'react';
import {cn} from "@/lib/utils";

interface BaseIconProps {
    className?: string;
    badge: React.ReactNode;
    color: DefaultColors;
}

const DEFAULT_VIBRANT_COLORS = {
    GOLD: '#FFB300',
    BLUE: '#2196f3',
    GREEN: '#4CAF50',
    RED: '#F44336',
    ORANGE: '#FF5722',
    PURPLE: '#9C27B0',
    TEAL: '#009688',
    PINK: '#E91E63',
    YELLOW: '#FFEB3B',
    CYAN: '#00BCD4',
    AMBER: '#FFC107',
    LIME: '#CDDC39',
    LIGHT_BLUE: '#03A9F4',
    LIGHT_GREEN: '#8BC34A',
    DEEP_ORANGE: '#FF5722',
    INDIGO: '#3F51B5',
    LIGHT_PURPLE: '#673AB7',
    DEEP_PURPLE: '#673AB7',
} as const;

export type DefaultColors = keyof typeof DEFAULT_VIBRANT_COLORS;

const BaseFolderIcon: React.FC<BaseIconProps> = (
    {
        className,
        badge,
        color,
    }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        className={cn("h-6 w-6 mr-2", className)}
    >
        <path
            d="M1 5a2 2 0 0 1 2-2h3.5l1.5 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5z"
            fill="none"
            stroke={DEFAULT_VIBRANT_COLORS[color]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {badge}
    </svg>
);

const BaseFileIcon: React.FC<BaseIconProps> = (
    {
        className,
        badge,
        color,
    }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"  // Reduced from 24 24
        className={cn("h-6 w-6 mr-2", className)}
    >
        <path
            d="M12 1H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"  // Adjusted path
            fill="none"
            stroke={DEFAULT_VIBRANT_COLORS[color]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M12 1v4a2 2 0 0 0 2 2h4"
            fill="none"
            stroke={DEFAULT_VIBRANT_COLORS[color]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {badge}
    </svg>
);

const BaseBadge = ({text, color = DEFAULT_VIBRANT_COLORS.BLUE}: { text: string; color?: string }) => (
    <text
        x="3"
        y="17"
        fill={color}
        fontSize="12"
        style={{
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto',
            fontWeight: '900',
            letterSpacing: '-0.25px',
            fontStretch: 'expanded',
            fontVariantCaps: 'titling-caps'
        }}
    >
        {text}
    </text>
);

const BADGE_ICONS = {
    NOTES: <path
        d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z M18 13l-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18 M2.3 2.3l7.286 7.286 M11 11h0"/>,
    CODE: <path
        d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1 M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>,
    DOCS: <path d="M13 4v16 M17 4v16 M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/>,
    TEXT: <path d="M13 4v16 M17 4v16 M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/>,
    IMAGE: <path
        d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 13h0"/>,
    VIDEO: <path d="M3 3h18v18H3z M7 3v18 M3 7.5h4 M3 12h18 M3 16.5h4 M17 3v18 M17 7.5h4 M17 16.5h4"/>,
    AUDIO: <path
        d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z M16 9a5 5 0 0 1 0 6 M19.364 18.364a9 9 0 0 0 0-12.728"/>,
    SHEET: <path
        d="M12 3v18 M3 3h18v18H3V3z M3 9h18 M3 15h18"/>
} as const;

const IconBadge = (
    {
        icon,
        color,
        svgOverrides = {}
    }: {
        icon: any;
        color: any;
        svgOverrides?: any
    }) => (
    <svg
        viewBox="0 0 24 24"
        width={svgOverrides.width ?? 10}
        height={svgOverrides.height ?? 10}
        x={svgOverrides.x ?? 3.5}
        y={svgOverrides.y ?? 8}
        fill="none"
        stroke={color}
        strokeWidth={svgOverrides.strokeWidth ?? 3.5}
        strokeLinecap={svgOverrides.strokeLinecap ?? "square"}
        strokeLinejoin={svgOverrides.strokeLinejoin ?? "miter"}
        {...svgOverrides}
    >
        {icon}
    </svg>
);


type IconConfig = {
    text: string;
    textColor: DefaultColors;
    folderColor: DefaultColors;
    icon?: React.ReactNode;
    iconColor?: string;
    svgOverrides?: any;
}

const createIconSet = (config: IconConfig) => {
    const TextBadge = () => <BaseBadge text={config.text} color={DEFAULT_VIBRANT_COLORS[config.textColor]}/>;
    const IconBadgeComponent = config.icon &&
        (() => <IconBadge
            icon={config.icon}
            color={config.iconColor || DEFAULT_VIBRANT_COLORS.GOLD}
            svgOverrides={config.svgOverrides}
        />);

    return {
        Folder: {
            Letter: () => <BaseFolderIcon color={config.folderColor} badge={<TextBadge/>}/>,
            Icon: IconBadgeComponent ?
                () => <BaseFolderIcon color={config.folderColor} badge={<IconBadgeComponent/>}/> : undefined
        },
        File: {
            Letter: () => <BaseFileIcon color={config.folderColor} badge={<TextBadge/>}/>,
            Icon: IconBadgeComponent ?
                () => <BaseFileIcon color={config.folderColor} badge={<IconBadgeComponent/>}/> : undefined
        }
    };
};


const configs = {
    Notes: {
        text: 'N',
        textColor: 'GOLD',
        folderColor: 'BLUE',
        icon: BADGE_ICONS.NOTES,
        svgOverrides: {}
    },
    Code: {
        text: 'C',
        textColor: 'GREEN',
        folderColor: 'BLUE',
        icon: BADGE_ICONS.CODE,
        svgOverrides: {strokeLinecap: "round"}
    },
    Docs: {
        text: 'D',
        textColor: 'PURPLE',
        folderColor: 'BLUE',
        icon: BADGE_ICONS.DOCS
    },
    Text: {
        text: 'T',
        textColor: 'CYAN',
        folderColor: 'BLUE',
        icon: BADGE_ICONS.TEXT
    },
    Image: {
        text: 'I',
        textColor: 'TEAL',
        folderColor: 'BLUE',
        icon: BADGE_ICONS.IMAGE,
        iconColor: DEFAULT_VIBRANT_COLORS.PURPLE,
        svgOverrides: {}
    },
    Video: {
        text: 'V',
        textColor: 'DEEP_PURPLE',
        folderColor: 'BLUE',
        icon: BADGE_ICONS.VIDEO,
        svgOverrides: { strokeLinecap: "round", strokeWidth: 2 }
    },
    Audio: {
        text: 'A',
        textColor: 'PURPLE',
        folderColor: 'BLUE',
        icon: BADGE_ICONS.AUDIO,
        iconColor: DEFAULT_VIBRANT_COLORS.BLUE,
        svgOverrides: {}
    },
    Spreadsheet: {
        text: 'S',
        textColor: 'ORANGE',
        folderColor: 'ORANGE',
        icon: BADGE_ICONS.SHEET,
        iconColor: DEFAULT_VIBRANT_COLORS.GREEN,
        svgOverrides: {}
    }
} as const;

export const MatrxIcon = Object.fromEntries(
    Object.entries(configs).map(([key, config]) => [key, createIconSet(config)])
) as typeof MatrxIcon;
