import React from "react";
import Link from "next/link";

type LogoProps = {
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    variant?: "icon" | "horizontal" | "vertical";
    href?: string;
    linkEnabled?: boolean;
};

const sizeConfig = {
    xs: { icon: 16, text: "text-xs", spacing: "space-x-1" },
    sm: { icon: 20, text: "text-sm", spacing: "space-x-1" },
    md: { icon: 24, text: "text-base", spacing: "space-x-1.5" },
    lg: { icon: 32, text: "text-lg", spacing: "space-x-2" },
    xl: { icon: 40, text: "text-xl", spacing: "space-x-2" },
    "2xl": { icon: 48, text: "text-2xl", spacing: "space-x-2.5" },
};

export const Logo: React.FC<LogoProps> = ({ 
    size = "md", 
    variant = "horizontal", 
    href = "/", 
    linkEnabled = true 
}) => {
    const { icon: iconSize, text: textSize, spacing } = sizeConfig[size];
    
    const renderIcon = () => (
        // Using a direct img tag to bypass Next.js image optimization
        <img
            src="/matrx/favicon-32x32.png"
            alt="Matrx Logo"
            width={iconSize}
            height={iconSize}
            style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        />
    );
    
    const renderText = () => <span className={`font-bold ${textSize}`}>Matrx</span>;
    
    const renderContent = () => {
        switch (variant) {
            case "icon":
                return renderIcon();
            case "vertical":
                return (
                    <div className={`flex flex-col items-center ${spacing.replace("x-", "y-")}`}>
                        {renderIcon()}
                        {renderText()}
                    </div>
                );
            case "horizontal":
            default:
                return (
                    <div className={`flex items-center ${spacing}`}>
                        {renderIcon()}
                        {renderText()}
                    </div>
                );
        }
    };
    
    if (linkEnabled) {
        return (
            <Link href={href} className="cursor-pointer">
                {renderContent()}
            </Link>
        );
    }
    
    return renderContent();
};

export const LogoIcon: React.FC<Omit<LogoProps, "variant">> = (props) => <Logo {...props} variant="icon" />;
export const LogoHorizontal: React.FC<Omit<LogoProps, "variant">> = (props) => <Logo {...props} variant="horizontal" />;
export const LogoVertical: React.FC<Omit<LogoProps, "variant">> = (props) => <Logo {...props} variant="vertical" />;

export default Logo;