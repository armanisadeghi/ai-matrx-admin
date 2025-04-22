import React, { useState } from "react";

const variants = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    success: "bg-green-500 dark:bg-green-600 text-white shadow-sm hover:bg-green-600 dark:hover:bg-green-700",
    outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
}

const sizes = {
    default: "h-9 px-4 py-2",
    xs: "h-7 rounded-md px-1 text-xs",
    sm: "h-8 rounded-md px-3 text-xs",
    md: "h-9 px-4 py-2",
    lg: "h-10 rounded-md px-8",
    xl: "h-12 px-8 py-3 text-base",
    "2xl": "h-14 px-10 py-3 text-base",
    "3xl": "h-16 px-12 py-3 text-base",
    icon: "h-10 w-10",
    roundIcon: "h-8 w-8 rounded-full p-0",
    m: "h-9 px-4 py-2",
    l: "h-10 px-6 py-2",
}

interface ButtonWithTooltipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof variants;
    size?: keyof typeof sizes;
    tooltipText?: string;
    placement?: "top" | "bottom";
    className?: string;
}

export const ButtonWithTooltip = ({ 
    children, 
    tooltipText = "Tooltip", 
    placement = "top", 
    className = "", 
    variant = "default", 
    size = "default", 
    ...props 
}: ButtonWithTooltipProps) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipPlacement = placement === "bottom" ? "bottom" : "top";
    const tooltipPositionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    };

    return (
        <div className="relative inline-block">
            <button
                className={`rounded transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                {...props}
            >
                {children}
            </button>
            {showTooltip && tooltipText && (
                <div
                    className={`absolute ${tooltipPositionClasses[tooltipPlacement]} bg-black text-white text-sm px-2 py-1 rounded whitespace-nowrap z-50`}
                >
                    {tooltipText}
                </div>
            )}
        </div>
    );
};

export default ButtonWithTooltip;