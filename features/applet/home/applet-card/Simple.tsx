'use client';
import React from 'react';
import { getAppIconWithBg, getAppIcon, COLOR_VARIANTS } from '@/features/applet/styles/StyledComponents';
import { AppletCardProps } from '@/features/applet/home/types';
import Image from 'next/image';

const SimpleAppletCard: React.FC<AppletCardProps> = ({
  applet,
  primaryColor,
  accentColor,
  onClick,
  isMobile
}) => {
  return (
    <div 
      className="group flex items-start p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-pointer transition-all duration-200 hover:shadow-sm"
      onClick={onClick}
    >
      {/* Icon */}
      <div className="mr-4 flex-shrink-0">
        {applet.appletIcon ? (
          <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-700">
            {getAppIcon({
              icon: applet.appletIcon,
              size: 24,
              color: accentColor,
            })}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              {applet.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-grow">
        <h3 className="text-gray-900 dark:text-gray-100 font-medium">
          {applet.name}
        </h3>
        
        {applet.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {applet.description}
          </p>
        )}
        
        {applet.creator && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            By {applet.creator}
          </div>
        )}
      </div>
      
      {/* Action button */}
      <div className={`px-3 py-1 text-xs rounded-full border bg-${accentColor}-500 dark:bg-${accentColor}-600 font-medium transition-colors ml-2 mt-1 whitespace-nowrap`}>
        Open
      </div>
    </div>
  );
};

export default SimpleAppletCard; 