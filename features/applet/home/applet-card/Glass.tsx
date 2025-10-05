// GlassAppletCard.tsx
"use client";
import React from "react";
import { getAppIcon, getColorClasses } from "@/features/applet/styles/StyledComponents";
import { AppletCardProps } from "@/features/applet/home/types";
import GlassContainer from "@/components/ui/added-my/GlassContainer";

const GlassAppletCard: React.FC<AppletCardProps> = ({ applet, primaryColor, accentColor, onClick, isMobile }) => {
    const primaryBgColor = getColorClasses("background", primaryColor);

    return (
        <GlassContainer
            backgroundImage={applet.imageUrl}
            backgroundColor={primaryBgColor}
            backgroundImageFit="contain"
            enableHover={true}
            height="100%"
            borderRadius="2xl"
            glassOpacity={10}
            borderOpacity={20}
            blurIntensity="md"
            overlayDarkness={70}
            cornerHighlights={true}
            enableGlow={true}
            enableShimmer={true}
            hoverScale={1.02}
            clickable={true} // Explicitly set clickable to true
            onClick={onClick}
        >
            {/* Card Content */}
            <div className="flex flex-col p-4 h-full">
                {/* Top section with icon */}
                <div className="flex items-center mb-3 relative z-10">
                    <div className="mr-3 bg-gray-100/20 backdrop-blur-sm p-2 rounded-lg transition-all duration-300 group-hover:bg-gray-100/30 group-hover:shadow-lg">
                        {applet.appletIcon ? (
                            getAppIcon({
                                icon: applet.appletIcon,
                                size: 24,
                                color: accentColor,
                                className: "text-gray-100 transition-transform duration-500 group-hover:scale-110",
                            })
                        ) : (
                            <div className="h-6 w-6 flex items-center justify-center text-gray-100 font-bold transition-transform duration-500 group-hover:scale-110">
                                {applet.name?.charAt(0) || "?"}
                            </div>
                        )}
                    </div>

                    <div className="flex-grow">
                        <h3 className="font-bold text-white truncate transition-all duration-300 group-hover:text-white/95 group-hover:translate-x-1">{applet.name}</h3>
                        {applet.creator && <span className="text-xs text-gray-200 opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1 inline-block">By {applet.creator}</span>}
                    </div>
                </div>

                {/* Description with fixed height and consistent truncation */}
                <div className="h-16 overflow-hidden mb-4 relative z-10">
                    <p className="text-sm text-gray-100/80 line-clamp-3 transition-all duration-300 group-hover:text-gray-100/90">{applet.description || ""}</p>
                </div>

                {/* Bottom action area */}
                <div className="mt-auto flex justify-between items-center relative z-10">
                    {/* Status indicator */}
                    <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse transition-all duration-300 group-hover:bg-green-300 group-hover:shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>
                        <span className="text-xs text-gray-100/80 transition-all duration-300 group-hover:text-gray-100">Online</span>
                    </div>

                    {/* Open Button */}
                    <div className="relative overflow-hidden rounded-full">
                        <div className="bg-gray-100/20 backdrop-blur-sm text-gray-100 border border-gray-100/30 px-4 py-1 rounded-full text-sm font-medium transition-all duration-300 group-hover:bg-gray-100/30 group-hover:border-gray-100/50 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:translate-y-[-2px] cursor-pointer">
                            Open
                        </div>
                    </div>
                </div>
            </div>
        </GlassContainer>
    );
};

export default GlassAppletCard;