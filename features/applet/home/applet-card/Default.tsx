// AppletCard.tsx
import React from 'react';
import Image from 'next/image';

interface AppletCardProps {
  applet: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    imageUrl?: string;
    creator?: string;
    appletIcon?: any;
    primaryColor?: string;
    accentColor?: string;
  };
  primaryColor: string;
  accentColor: string;
  accentColorClass: string;
  onClick: () => void;
  getAppIcon: (props: any) => React.ReactNode;
}

const AppletCard: React.FC<AppletCardProps> = ({
  applet,
  primaryColor,
  accentColor,
  accentColorClass,
  onClick,
  getAppIcon
}) => {
  // Get applet-specific colors or fall back to app colors
  const appletBgColor = applet.primaryColor || primaryColor;
  const appletAccentColor = applet.accentColor || accentColor;
  const appletBgClass = appletBgColor ? `bg-[${appletBgColor}]` : 'bg-white dark:bg-gray-800';
  const appletAccentClass = appletAccentColor ? `text-[${appletAccentColor}]-500 border-[${appletAccentColor}]-500` : accentColorClass;
  
  console.log("AppletCard appletAccentClass", appletAccentColor);
  console.log("AppletCard appletBgClass", appletBgColor);
  console.log("AppletCard accentColorClass", accentColorClass);
  console.log("AppletCard appletAccentClass", appletAccentClass);

  return (
    <div 
      className="group relative rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 cursor-pointer border border-gray-200 dark:border-gray-700"
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
          <div className={`w-full h-full flex items-center justify-center ${appletBgClass}`}>
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
                color: appletAccentColor || accentColor || 'blue',
                className: 'text-gray-100'
              })}
            </div>
          )}
          <h3 className="text-white font-semibold text-lg truncate">
            {applet.name}
          </h3>
        </div>
      </div>
      
      {/* Card content */}
      <div className="p-4 bg-white dark:bg-gray-800">
        <div className="h-[3.5rem] mb-4">
          {applet.description ? (
            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
              {applet.description}
            </p>
          ) : (
            <div className="h-full"></div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          {/* Optional creator badge */}
          {applet.creator && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              By {applet.creator}
            </span>
          )}
          
          {/* Access button with applet accent color */}
          <div className={`px-3 py-1 text-sm rounded-full border ${appletAccentClass} font-medium transition-colors`}>
            Open
          </div>
        </div>
      </div>
      
      {/* Hover overlay effect */}
      <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};

export default AppletCard;