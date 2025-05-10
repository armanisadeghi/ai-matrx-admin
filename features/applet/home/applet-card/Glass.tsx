// GlassAppletCard.tsx
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

const GlassAppletCard: React.FC<AppletCardProps> = ({
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
  const appletBgClass = appletBgColor ? `bg-[${appletBgColor}]` : 'bg-indigo-500';
  const appletAccentClass = appletAccentColor ? `text-[${appletAccentColor}] border-[${appletAccentColor}]` : accentColorClass;
  
  return (
    <div 
      className="relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer h-full"
      onClick={onClick}
    >
      {/* Background Image or Color */}
      <div className="absolute inset-0">
        {applet.imageUrl ? (
          <Image
            src={applet.imageUrl}
            alt={applet.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className={`w-full h-full ${appletBgClass}`}></div>
        )}
        {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/60 to-gray-900/40"></div>
      </div>
      
      {/* Glass effect card body */}
      <div className="relative backdrop-blur-md bg-gray-100/10 border border-gray-100/20 h-full flex flex-col p-4">
        {/* Top section with icon */}
        <div className="flex items-center mb-3">
          <div className="mr-3 bg-gray-100/20 backdrop-blur-sm p-2 rounded-lg">
            {applet.appletIcon ? (
              getAppIcon({
                icon: applet.appletIcon,
                size: 24,
                color: appletAccentColor || accentColor || "blue",
                className: "text-gray-100"
              })
            ) : (
              <div className="h-6 w-6 flex items-center justify-center text-gray-100 font-bold">
                {applet.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          <div className="flex-grow">
            <h3 className="font-bold text-white truncate">{applet.name}</h3>
            {applet.creator && (
              <span className="text-xs text-gray-200 opacity-80">
                By {applet.creator}
              </span>
            )}
          </div>
          
          <div className="flex-shrink-0">
            <div className="text-xs text-gray-100/80 px-2 py-1 rounded-full bg-gray-100/10 border border-gray-100/20">
              {applet.slug}
            </div>
          </div>
        </div>
        
        {/* Description with fixed height and consistent truncation */}
        <div className="h-16 overflow-hidden mb-4">
          <p className="text-sm text-gray-100/80 line-clamp-3">
            {applet.description || ''}
          </p>
        </div>
        
        {/* Bottom action area */}
        <div className="mt-auto flex justify-between items-center">
          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-gray-100/80">Online</span>
          </div>
          
          {/* Open Button */}
          <div className="relative group">
            <div className="bg-gray-100/20 backdrop-blur-sm text-gray-100 border border-gray-100/30 px-4 py-1 rounded-full text-sm font-medium transition-all duration-300 group-hover:bg-gray-100/30">
              Open
            </div>
            <div className="absolute inset-0 rounded-full bg-gray-100/10 blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        </div>
      </div>
      
      {/* Hover effect */}
      <div className="absolute inset-0 bg-gray-100/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  );
};

export default GlassAppletCard;