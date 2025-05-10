// QuarterThreeQuartersDisplay.tsx
import React from 'react';
import Image from 'next/image';

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

const SideBySideAppDisplay: React.FC<AppDisplayProps> = ({
  appName,
  appDescription,
  appIcon,
  appImageUrl,
  creator,
  accentColor,
  primaryColor,
  accentColorClass,
  getAppIconWithBg
}) => {
  return (
    <div className="max-w-7xl mx-auto mb-12">
      {/* Always side-by-side layout (no stacking) with 1/4 - 3/4 split */}
      <div className="flex flex-row items-start gap-6">
        {/* Left side: App information (1/4 width) */}
        <div className="w-1/4 min-w-0 pr-2">
          <div className="flex flex-col items-start gap-4">
            {/* App Icon */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-md flex-shrink-0 flex items-center justify-center">
              {appIcon ? (
                getAppIconWithBg({
                  icon: appIcon,
                  size: 32,
                  color: accentColor || 'blue',
                  primaryColor: primaryColor || 'gray',
                  className: 'w-full h-full flex items-center justify-center'
                })
              ) : (
                <div className="text-3xl opacity-30 text-gray-400 dark:text-gray-600">
                  {appName?.charAt(0) || 'A'}
                </div>
              )}
            </div>
            
            {/* App Title and Creator */}
            <div className="min-w-0 w-full">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
                {appName}
              </h1>
              {creator && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Created by {creator}
                </p>
              )}
            </div>
          </div>
          
          {/* App Description - allowed to wrap freely */}
          {appDescription && (
            <div className="text-gray-600 dark:text-gray-300 mt-4 w-full">
              <p className="break-words">{appDescription}</p>
            </div>
          )}
          
          {/* Optional action buttons or metadata */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${accentColorClass} border`}>
              App
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              Integration
            </span>
          </div>
        </div>
        
        {/* Right side: App Image (3/4 width) */}
        {appImageUrl ? (
          <div className="w-3/4">
            <div className="rounded-xl overflow-hidden shadow-md aspect-video relative">
              <Image 
                src={appImageUrl} 
                alt={`${appName} preview`} 
                fill
                className="object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="w-3/4 rounded-xl bg-gray-100 dark:bg-gray-800 aspect-video flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-600 text-lg">No preview available</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SideBySideAppDisplay;