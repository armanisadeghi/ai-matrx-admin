// ModernAppDisplay.tsx
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

const ModernAppDisplay: React.FC<AppDisplayProps> = ({
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left column: App information */}
          <div className="md:w-3/5 p-6 md:p-8 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              {/* App Icon */}
              <div className="w-14 h-14 rounded-lg overflow-hidden shadow-md flex-shrink-0 flex items-center justify-center">
                {appIcon ? (
                  getAppIconWithBg({
                    icon: appIcon,
                    size: 28,
                    color: accentColor || 'blue',
                    primaryColor: primaryColor || 'gray',
                    className: 'w-full h-full flex items-center justify-center'
                  })
                ) : (
                  <div className="text-2xl opacity-30 text-gray-400 dark:text-gray-600">
                    {appName?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {appName}
                </h1>
                {creator && (
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      By {creator}
                    </span>
                    <span className={`ml-3 w-2 h-2 rounded-full ${accentColorClass.replace('text-', 'bg-')}`}></span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">Active</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* App Description */}
            {appDescription && (
              <div className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                <p>{appDescription}</p>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
              <button className={`px-4 py-2 rounded-lg ${accentColorClass.replace('text-', 'bg-').replace('border-', '')} text-gray-100 font-medium`}>
                Open App
              </button>
              <button className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                View Details
              </button>
            </div>
          </div>
          
          {/* Right column: App Image */}
          {appImageUrl && (
            <div className="md:w-2/5 relative">
              <div className="h-full">
                <Image 
                  src={appImageUrl} 
                  alt={`${appName} preview`} 
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-gray-800 md:via-transparent to-transparent opacity-30 md:opacity-0"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernAppDisplay;