'use client';

import React from 'react';
import { useAppSelector } from '@/lib/redux';
import { 
  selectAppName,
  selectAppSlug,
  selectAppCreator,
  selectAppLayoutType,
  selectAppPrimaryColor,
  selectAppAccentColor,
  selectAppletsForAppCount,
  selectAppletIdsForApp,
} from '@/lib/redux/app-builder/selectors/appSelectors';
import { selectAppletsByIds } from '@/lib/redux/app-builder/selectors/appletSelectors';

interface AppInfoCardProps {
  appId: string;
  className?: string;
}

const AppInfoCard: React.FC<AppInfoCardProps> = ({ appId, className = '' }) => {
  // Use Redux selectors to get app data directly
  const name = useAppSelector(state => selectAppName(state, appId)) || 'Not set';
  const slug = useAppSelector(state => selectAppSlug(state, appId)) || 'Not set';
  const creator = useAppSelector(state => selectAppCreator(state, appId)) || 'Not set'; 
  const layoutType = useAppSelector(state => selectAppLayoutType(state, appId));
  const primaryColor = useAppSelector(state => selectAppPrimaryColor(state, appId)) || 'gray';
  const accentColor = useAppSelector(state => selectAppAccentColor(state, appId)) || 'rose';
  const appletCount = useAppSelector(state => selectAppletsForAppCount(state, appId)) || 0;
  const appletIds = useAppSelector(state => selectAppletIdsForApp(state, appId)) || [];
  const applets = useAppSelector(state => selectAppletsByIds(state, appletIds)) || [];
  
  // Calculate container and field counts across all applets - safely handle empty/undefined values
  let totalContainers = 0;
  let totalFields = 0;
  
  // Only process if we have applets
  if (applets && applets.length > 0) {
    applets.forEach(applet => {
      if (applet) {
        const containers = applet.containers || [];
        totalContainers += containers.length;
        
        // Count fields in all containers
        containers.forEach(container => {
          if (container && container.fields) {
            totalFields += container.fields.length || 0;
          }
        });
      }
    });
  }

  // Format layout type for display
  const formattedLayoutType = layoutType 
    ? layoutType.charAt(0).toUpperCase() + layoutType.slice(1) 
    : 'Not set';

  return (
    <div className={`p-4 bg-${primaryColor} rounded-lg border-border ${className}`}>
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">App Information</h4>
      
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Name:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Slug:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">matrx.com/apps/{slug}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Creator:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{creator}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Layout:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formattedLayoutType}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Colors:</span>
          <span className="flex items-center">
            <span className={`inline-block w-6 h-6 rounded-none bg-${primaryColor}-500 mr-1`}></span>
            <span className={`inline-block w-3 h-3 rounded-full bg-${accentColor}-500 ml-1`}></span>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Associated Applets:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{appletCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Compiled Containers:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{totalContainers}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Compiled Fields:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{totalFields}</span>
        </div>
      </div>
    </div>
  );
};

export default AppInfoCard; 