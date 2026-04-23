/**
 * Custom SVG icons used by language-display + file-icon.
 *
 * Duplicated from components/DirectoryTree/custom-icons.tsx so features/code
 * has no dependency on paths that are slated for deletion.
 */
import React from "react";

interface TwoColorPythonIconProps {
  size?: number;
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
  strokeWidth?: number;
}

export const TwoColorPythonIcon: React.FC<TwoColorPythonIconProps> = ({
  size = 18,
  className = "",
  primaryColor = "#4B8BBE",
  secondaryColor = "#FFD43B",
  strokeWidth = 2,
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
      <defs>
        <clipPath id="mx-code-py-top">
          <rect x="0" y="0" width="24" height="12" />
        </clipPath>
        <clipPath id="mx-code-py-bottom">
          <rect x="0" y="12" width="24" height="12" />
        </clipPath>
      </defs>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <g clipPath="url(#mx-code-py-top)" stroke={primaryColor}>
        <path d="M12 9h-7a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h3" />
        <path d="M12 15h7a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-3" />
        <path d="M8 9v-4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2h-4a2 2 0 0 0 -2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2 -2v-4" />
        <path d="M11 6l0 .01" />
        <path d="M13 18l0 .01" />
      </g>
      <g clipPath="url(#mx-code-py-bottom)" stroke={secondaryColor}>
        <path d="M12 9h-7a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h3" />
        <path d="M12 15h7a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-3" />
        <path d="M8 9v-4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2h-4a2 2 0 0 0 -2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2 -2v-4" />
        <path d="M11 6l0 .01" />
        <path d="M13 18l0 .01" />
      </g>
    </svg>
  );
};
