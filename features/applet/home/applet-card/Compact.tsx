'use client';
import React from 'react';
import { getAppIconWithBg, getAppIcon, COLOR_VARIANTS } from '@/features/applet/styles/StyledComponents';
import { AppletCardProps } from '@/features/applet/home/types';

const CompactAppletCard: React.FC<AppletCardProps> = ({
  applet,
  primaryColor,
  accentColor,
  onClick,
  isMobile
}) => {
  
  return (
    <div 
      className="group relative flex items-center p-3 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-all duration-150"
      onClick={onClick}
    >
      {/* Icon - using circle with accent color border */}
      <div className="flex-shrink-0 mr-3">
        {applet.appletIcon ? (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border bg-${accentColor}-500 dark:bg-${accentColor}-600`}>
            {getAppIcon({
              icon: applet.appletIcon,
              size: 16,
              color: accentColor,
            })}
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-${accentColor}-500 dark:border-${accentColor}-600`}>
            <span className="text-xs font-medium">
              {applet.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
      </div>
      
      {/* Name and Description */}
      <div className="flex-grow min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {applet.name}
        </h3>
        
        {applet.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {applet.description}
          </p>
        )}
      </div>
      
      {/* Arrow icon - shows on hover */}
      <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default CompactAppletCard; 