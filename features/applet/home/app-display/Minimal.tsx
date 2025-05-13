'use client';
import React from 'react';

interface AppDisplayProps {
  appName: string;
  appDescription: string;
  appIcon: any;
  appImageUrl: string;
  creator: string;
  accentColor: string;
  primaryColor: string;
  accentColorClass: string;
  getAppIconWithBg: (props: any) => React.ReactNode;
}

const MinimalAppDisplay: React.FC<AppDisplayProps> = ({
  appName,
  appDescription,
  appIcon,
  creator,
  accentColor,
  primaryColor,
  getAppIconWithBg
}) => {
  return (
    <div className="max-w-7xl mx-auto mb-8 px-2">
      <div className="flex items-center gap-3">
        {/* App Icon - sized to match the height of two lines of text */}
        {appIcon && (
          <div className="w-12 h-12 flex-shrink-0">
            {getAppIconWithBg({
              icon: appIcon,
              size: 32,
              color: accentColor || 'blue',
              primaryColor: primaryColor || 'gray',
              className: 'rounded-md bg-gray-100 dark:bg-gray-800 p-2 shadow-sm'
            })}
          </div>
        )}
        
        {/* App Name and Creator */}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {appName}
          </h1>
          {creator && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By {creator}
            </p>
          )}
        </div>
      </div>
      
      {/* Description (only if not empty) - reduced spacing */}
      {appDescription && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-2xl">
          {appDescription}
        </p>
      )}
    </div>
  );
};

export default MinimalAppDisplay;