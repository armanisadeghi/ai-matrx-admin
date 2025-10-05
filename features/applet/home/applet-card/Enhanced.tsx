// EnhancedAppletCard.tsx - Default card with glass effect
'use client';
import React from 'react';
import { getAppIcon } from '@/features/applet/styles/StyledComponents';
import { AppletCardProps } from '@/features/applet/home/types';
import Image from 'next/image';
import GlassContainer from '@/components/ui/added-my/GlassContainer';

const EnhancedAppletCard: React.FC<AppletCardProps> = ({
  applet,
  primaryColor,
  accentColor,
  onClick,
  isMobile
}) => {

  return (
    <div 
      className="group relative rounded-xl overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-all duration-300"
      onClick={onClick}
    >
      {/* Card image/banner */}
      <div className="h-40 w-full bg-gray-200 dark:bg-gray-700 relative">
        {applet.imageUrl ? (
          <Image
            src={applet.imageUrl}
            alt={applet.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-${primaryColor}-500 dark:bg-${primaryColor}-600`}>
            <div className="opacity-10 text-5xl">{applet.name?.charAt(0) || '?'}</div>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        {/* Applet icon and name on image */}
        <div className="absolute bottom-0 left-0 p-4 w-full flex items-center gap-3">
          {applet.appletIcon && (
            <div className="rounded-full bg-gray-100/20 backdrop-blur-sm p-1 flex-shrink-0">
              {getAppIcon({
                icon: applet.appletIcon,
                size: 24,
                color: accentColor,
                className: 'text-gray-100'
              })}
            </div>
          )}
          <h3 className="text-white font-semibold text-lg truncate">
            {applet.name}
          </h3>
        </div>
      </div>
      
      {/* Glass Card content */}
      <div className="relative">
        <GlassContainer
          backgroundColor="bg-white dark:bg-gray-800"
          borderRadius={0}
          glassOpacity={15}
          borderOpacity={30}
          blurIntensity="xl"
          overlayDarkness={0}
          cornerHighlights={false}
          enableGlow={false}
          enableShimmer={false}
          enableHover={false}
          height="auto"
        >
          <div className="p-4">
            <div className="h-[3.5rem] mb-4">
              {applet.description ? (
                <p className="text-gray-800 dark:text-gray-200 text-sm line-clamp-3">
                  {applet.description}
                </p>
              ) : (
                <div className="h-full"></div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              {/* Optional creator badge */}
              {applet.creator && (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  By {applet.creator}
                </span>
              )}
              
              {/* Access button with glass effect */}
              <div className="px-3 py-1 text-sm rounded-full bg-gray-100/30 dark:bg-gray-100/20 backdrop-blur-sm border border-gray-300/50 dark:border-gray-100/30 text-gray-800 dark:text-gray-200 font-medium transition-all duration-300 hover:bg-gray-100/50 hover:border-gray-300/70 dark:hover:bg-gray-100/30 dark:hover:border-gray-100/50">
                Open
              </div>
            </div>
          </div>
        </GlassContainer>
        
        {/* Hover overlay effect */}
        <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </div>
    </div>
  );
};

export default EnhancedAppletCard;

