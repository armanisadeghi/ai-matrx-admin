// QuarterThreeQuarters.tsx
'use client';
import React from 'react';
import { getAppIconWithBg, getAppIcon, COLOR_VARIANTS } from '@/features/applet/styles/StyledComponents';
import { AppDisplayProps } from '@/features/applet/home/types';
import Image from 'next/image';


const QuarterThreeQuarters: React.FC<AppDisplayProps> = ({
  appName,
  appDescription,
  appIcon,
  appImageUrl,
  creator,
  accentColor,
  primaryColor,
  isMobile
}) => {
  return (
    <div className="max-w-7xl mx-auto mb-12">
      <div className="flex flex-row items-start gap-6">
        {/* Left column - App info (1/4 width) */}
        <div className="w-1/4 min-w-0">
          {/* App Icon */}
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-textured shadow-md flex-shrink-0 flex items-center justify-center mb-4">
            {appIcon ? (
              getAppIconWithBg({
                icon: appIcon,
                size: 40,
                color: accentColor || 'blue',
                primaryColor: primaryColor || 'gray',
                className: 'w-full h-full flex items-center justify-center'
              })
            ) : (
              <div className="text-4xl opacity-30 text-gray-400 dark:text-gray-600">
                {appName?.charAt(0) || 'A'}
              </div>
            )}
          </div>
          
          {/* App Name and Creator */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {appName}
          </h1>
          
          {creator && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Created by {creator}
            </p>
          )}
          
          {/* App Description */}
          {appDescription && (
            <p className="text-gray-600 dark:text-gray-300">
              {appDescription}
            </p>
          )}
        </div>
        
        {/* Right column - App image (3/4 width) */}
        {appImageUrl && (
          <div className="w-3/4">
            <div className="w-full rounded-xl overflow-hidden shadow-md aspect-[16/9] relative">
              <Image 
                src={appImageUrl} 
                alt={`${appName} banner`} 
                fill
                sizes="(max-width: 768px) 100vw, 75vw"
                className="object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuarterThreeQuarters;