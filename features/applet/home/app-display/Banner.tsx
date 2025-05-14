'use client';

import React from 'react';
import { getAppIconWithBg, getAppIcon, COLOR_VARIANTS } from '@/features/applet/styles/StyledComponents';
import { AppDisplayProps } from '@/features/applet/home/types';

const BannerAppDisplay: React.FC<AppDisplayProps> = ({
  appName,
  appDescription,
  appIcon,
  appImageUrl,
  creator,
  accentColor,
  primaryColor,
  isMobile
}) => {
  // Define a background class based on whether we have an image or use color
  const bgClass = appImageUrl 
    ? `bg-cover bg-center` 
    : (primaryColor ? `bg-[${primaryColor}]` : 'bg-gray-100 dark:bg-gray-800');
  
  const textColorClass = appImageUrl ? 'text-gray-100' : 'text-gray-900 dark:text-gray-100';
  const textDescriptionClass = appImageUrl ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300';
  
  return (
    <div 
      className={`w-full relative mb-12 rounded-xl overflow-hidden ${bgClass}`}
      style={appImageUrl ? { backgroundImage: `url(${appImageUrl})` } : {}}
    >
      {/* Overlay gradient when image is present */}
      {appImageUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-gray-900/30"></div>
      )}
      
      <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-5 mb-4">
          {/* App Icon */}
          {appIcon && (
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 shadow-md">
              {getAppIconWithBg({
                icon: appIcon,
                size: 36,
                color: accentColor || 'blue',
                primaryColor: 'gray',
                className: 'w-full h-full flex items-center justify-center'
              })}
            </div>
          )}
          
          <div>
            <h1 className={`text-3xl font-bold ${textColorClass}`}>
              {appName}
            </h1>
            {creator && (
              <p className={`text-sm mt-1 ${appImageUrl ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                Created by {creator}
              </p>
            )}
          </div>
        </div>
        
        {appDescription && (
          <p className={`${textDescriptionClass} mt-4 max-w-2xl text-base leading-relaxed`}>
            {appDescription}
          </p>
        )}
      </div>
    </div>
  );
};

export default BannerAppDisplay; 