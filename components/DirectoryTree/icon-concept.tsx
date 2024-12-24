'use client';

import React from 'react';

interface BaseIconProps {
    className?: string;
    badge?: React.ReactNode;
    color?: {
        primary: string;
        secondary: string;
    };
}

const defaultColors = {
    primary: '#FFB300',
    secondary: '#2196F3',
};

const BaseFileIcon: React.FC<BaseIconProps> = ({
                                                   className,
                                                   badge,
                                                   color = defaultColors
                                               }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={className}
    >
        <path
            d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"
            fill="none"
            stroke={color.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M14 2v4a2 2 0 0 0 2 2h4"
            fill="none"
            stroke={color.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {badge}
    </svg>
);

const BaseFolderIcon: React.FC<BaseIconProps> = ({
                                                     className,
                                                     badge,
                                                     color = defaultColors
                                                 }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={className}
    >
        <path
            d="M2 6a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"
            fill="none"
            stroke={color.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Bottom border with gap for badge */}
        <path
            d="M2 18h5 M13 18h9"
            fill="none"
            stroke={color.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {badge}
    </svg>
);

const MatrixBadge: React.FC<{ color?: string }> = ({ color = '#2196F3' }) => (
    <g transform="translate(6.5, 0)">
        <path
            d="M4 12v7M4 12l5 7M9 12v7"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </g>
);

export const MatrixNotesIcon: React.FC<Omit<BaseIconProps, 'badge'>> = (props) => (
    <BaseFileIcon
        {...props}
        badge={<MatrixBadge color={props.color?.secondary} />}
    />
);

export const MatrixNotesFolderIcon: React.FC<Omit<BaseIconProps, 'badge'>> = (props) => (
    <BaseFolderIcon
        {...props}
        badge={<MatrixBadge color={props.color?.secondary} />}
    />
);

const TextBadge: React.FC<{ text: string; color?: string }> = ({
                                                                   text,
                                                                   color = '#2196F3'
                                                               }) => (
    <g transform="translate(0, -1)">
        <text
            x="12"
            y="17"
            textAnchor="middle"
            fill={color}
            fontSize="10"
            fontWeight="bold"
            style={{ fontFamily: 'Arial, sans-serif' }}
        >
            {text}
        </text>
    </g>
);

export const TextFileIcon: React.FC<
    Omit<BaseIconProps, 'badge'> & { text: string }
> = ({ text, ...props }) => (
    <BaseFileIcon
        {...props}
        badge={<TextBadge text={text} color={props.color?.secondary} />}
    />
);

export const TextFolderIcon: React.FC<
    Omit<BaseIconProps, 'badge'> & { text: string }
> = ({ text, ...props }) => (
    <BaseFolderIcon
        {...props}
        badge={<TextBadge text={text} color={props.color?.secondary} />}
    />
);

export default {
    MatrixNotesIcon,
    MatrixNotesFolderIcon,
    TextFileIcon,
    TextFolderIcon
};