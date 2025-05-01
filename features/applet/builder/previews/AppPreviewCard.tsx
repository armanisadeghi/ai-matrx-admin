'use client';

import React from 'react';
import { CalendarIcon, CogIcon, UsersIcon, StarIcon, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CustomAppConfig } from '@/features/applet/builder/builder.types';
import { cn } from '@/lib/utils';
import { ICON_OPTIONS } from '@/features/applet/layouts/helpers/StyledComponents';

interface AppPreviewCardProps {
  app: Partial<CustomAppConfig>;
  className?: string;
}

const AppPreviewCard: React.FC<AppPreviewCardProps> = ({ app, className }) => {
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render the app icon
  const renderAppIcon = () => {
    if (!app.mainAppIcon) return <CogIcon className="h-5 w-5" />;
    
    const IconComponent = ICON_OPTIONS[app.mainAppIcon];
    if (!IconComponent) return <CogIcon className="h-5 w-5" />;
    
    return <IconComponent className="h-5 w-5" />;
  };

  // Generate placeholder color classes based on app config
  const getPrimaryColorClass = (type: 'bg' | 'text' | 'border') => {
    const color = app.primaryColor || 'gray';
    if (type === 'bg') return `bg-${color}-100 dark:bg-${color}-900/30`;
    if (type === 'text') return `text-${color}-600 dark:text-${color}-400`;
    return `border-${color}-200 dark:border-${color}-800`;
  };

  const getAccentColorClass = (type: 'bg' | 'text' | 'border') => {
    const color = app.accentColor || 'rose';
    if (type === 'bg') return `bg-${color}-500 dark:bg-${color}-600`;
    if (type === 'text') return `text-${color}-500 dark:text-${color}-400`;
    return `border-${color}-500 dark:border-${color}-600`;
  };

  return (
    <div className={cn("w-full", className)}>
      <Card className="border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* App Banner Image */}
        {app.imageUrl ? (
          <div className="w-full h-36 relative">
            <img
              src={app.imageUrl}
              alt={app.name || 'App Banner'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`w-full h-36 flex items-center justify-center ${getPrimaryColorClass('bg')} ${getPrimaryColorClass('border')} border-b`}>
            <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
              <ImageIcon className="h-10 w-10 mb-2" />
              <span className="text-sm">App Banner Image</span>
            </div>
          </div>
        )}

        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {/* App Icon */}
              <div className={`p-2 rounded-md ${getAccentColorClass('bg')} text-white`}>
                {renderAppIcon()}
              </div>
              
              <div>
                <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {app.name || 'App Name'}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                  {app.slug ? `/${app.slug}` : '/app-url'}
                </CardDescription>
              </div>
            </div>

            {/* Creator Avatar */}
            <Avatar className="h-8 w-8 bg-gray-200 dark:bg-gray-700">
              <AvatarFallback className="text-gray-600 dark:text-gray-300 text-xs">
                {getInitials(app.creator || 'User')}
              </AvatarFallback>
            </Avatar>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
            {app.description || 'App description will appear here. Provide a clear and concise description of what your app does.'}
          </p>

          {/* App Features/Statistics */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className={`p-2 rounded-md ${getPrimaryColorClass('bg')} ${getPrimaryColorClass('border')} border`}>
              <div className="flex items-center space-x-2">
                <UsersIcon className={`h-4 w-4 ${getPrimaryColorClass('text')}`} />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {(app.appletList?.length || 0)} Applets
                </span>
              </div>
            </div>
            
            <div className={`p-2 rounded-md ${getPrimaryColorClass('bg')} ${getPrimaryColorClass('border')} border`}>
              <div className="flex items-center space-x-2">
                <StarIcon className={`h-4 w-4 ${getPrimaryColorClass('text')}`} />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {app.layoutType || 'Standard'} Layout
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Created by {app.creator || 'Unknown'}
              </span>
            </div>
            
            <Badge variant="outline" className={`${getAccentColorClass('text')} border ${getAccentColorClass('border')}`}>
              Preview
            </Badge>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AppPreviewCard;
