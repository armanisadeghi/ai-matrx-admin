// AppDisplay.tsx
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

const AppDisplay: React.FC<AppDisplayProps> = ({
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
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* App Icon - Small square container */}
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-md flex-shrink-0 flex items-center justify-center">
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
        
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {appName}
          </h1>
          {creator && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Created by {creator}
            </p>
          )}
          {appDescription && (
            <p className="text-gray-600 dark:text-gray-300 mt-4 max-w-3xl">
              {appDescription}
            </p>
          )}
        </div>
      </div>
      
      {/* App Banner Image - Optional landscape banner */}
      {appImageUrl && (
        <div className="mt-8 w-full rounded-xl overflow-hidden shadow-md aspect-[21/9] relative">
          <Image 
            src={appImageUrl} 
            alt={`${appName} banner`} 
            fill
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default AppDisplay;