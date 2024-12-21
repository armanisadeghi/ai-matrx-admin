
import React from 'react';

export const TwoColorPythonIcon = (
    {
        size = 24,
        className = '',
        primaryColor = '#4B8BBE',   // Python blue
        secondaryColor = '#FFD43B', // Python yellow
        strokeWidth = 2
    }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {/* Define clip paths for top and bottom halves */}
            <defs>
                <clipPath id="topHalf">
                    <rect x="0" y="0" width="24" height="12"/>
                </clipPath>
                <clipPath id="bottomHalf">
                    <rect x="0" y="12" width="24" height="12"/>
                </clipPath>
            </defs>

            {/* Background transparent path */}
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>

            {/* Top half (blue) */}
            <g clipPath="url(#topHalf)" stroke={primaryColor}>
                <path d="M12 9h-7a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h3"/>
                <path d="M12 15h7a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-3"/>
                <path
                    d="M8 9v-4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2h-4a2 2 0 0 0 -2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2 -2v-4"/>
                <path d="M11 6l0 .01"/>
                <path d="M13 18l0 .01"/>
            </g>

            {/* Bottom half (yellow) */}
            <g clipPath="url(#bottomHalf)" stroke={secondaryColor}>
                <path d="M12 9h-7a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h3"/>
                <path d="M12 15h7a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-3"/>
                <path
                    d="M8 9v-4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2h-4a2 2 0 0 0 -2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2 -2v-4"/>
                <path d="M11 6l0 .01"/>
                <path d="M13 18l0 .01"/>
            </g>
        </svg>
    );
};
