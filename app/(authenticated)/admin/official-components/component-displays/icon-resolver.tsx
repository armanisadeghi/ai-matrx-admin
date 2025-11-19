'use client';

import React from 'react';
import { ComponentEntry } from '../parts/component-list';
import { ComponentDisplayWrapper } from '../component-usage';
import IconResolver, { getIconComponent, DynamicIcon } from '@/components/official/IconResolver';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function IconResolverDisplay({ component }: ComponentDisplayProps) {
  if (!component) return null;
  
  // Example code with all available props and their default values
  const code = `import IconResolver, { getIconComponent, DynamicIcon } from '@/components/official/IconResolver';

// Component Usage - Full featured with dynamic loading
<IconResolver 
  iconName="Home"           // Icon name (string) - Lucide or custom icons
  className="h-6 w-6"       // Default: "h-4 w-4"
  size={24}                 // Optional size prop
  fallbackIcon="Zap"        // Default: "Zap" - used if icon not found
/>

// Utility Function - Synchronous (only works with static/cached icons)
const Icon = getIconComponent("Settings", "Zap");
<Icon className="h-5 w-5" />

// Dynamic Icon Component - With color support
<DynamicIcon 
  name="Star"               // Icon name
  color="blue"              // Optional color class (gray, blue, red, etc.)
  size={5}                  // Optional size (default: 4)
  className=""              // Additional classes
  fallbackIcon="Zap"        // Fallback icon name
/>

// Custom Icons (react-icons)
<IconResolver iconName="FcGoogle" className="h-6 w-6" />
<IconResolver iconName="FaBrave" className="h-6 w-6" />

// Benefits:
// - Static imports for 140+ common icons (~50KB)
// - Dynamic imports for rare icons (loaded once, cached forever)
// - Replaces 'import * as LucideIcons' (~600KB)
// - 99% bundle size reduction for icon imports
// - Seamless loading (shows fallback while loading dynamic icons)`;

  return (
    <ComponentDisplayWrapper
      component={component}
      code={code}
      description="Hybrid icon resolver with static imports for common icons and dynamic imports for others. Dramatically reduces bundle size by avoiding wildcard imports while supporting all 1000+ Lucide icons."
    >
      <div className="w-full space-y-6">
        {/* IconResolver Component Demo */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">IconResolver Component</h3>
          <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
            <div className="flex flex-col items-center gap-2">
              <IconResolver iconName="Home" className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Static (Home)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <IconResolver iconName="Settings" className="h-8 w-8 text-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Static (Settings)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <IconResolver iconName="Sparkles" className="h-8 w-8 text-purple-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Dynamic (Sparkles)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <IconResolver iconName="Rocket" className="h-8 w-8 text-orange-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Dynamic (Rocket)</span>
            </div>
          </div>
        </div>

        {/* DynamicIcon with Color Support */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">DynamicIcon with Colors</h3>
          <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
            <DynamicIcon name="Star" color="yellow" size={8} />
            <DynamicIcon name="Heart" color="red" size={8} />
            <DynamicIcon name="Check" color="green" size={8} />
            <DynamicIcon name="AlertCircle" color="orange" size={8} />
            <DynamicIcon name="Info" color="blue" size={8} />
          </div>
        </div>

        {/* Custom Icons (react-icons) */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Custom Icons (react-icons)</h3>
          <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
            <div className="flex flex-col items-center gap-2">
              <IconResolver iconName="FcGoogle" className="h-8 w-8" />
              <span className="text-xs text-gray-600 dark:text-gray-400">FcGoogle</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <IconResolver iconName="FaBrave" className="h-8 w-8" />
              <span className="text-xs text-gray-600 dark:text-gray-400">FaBrave</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <IconResolver iconName="FcDocument" className="h-8 w-8" />
              <span className="text-xs text-gray-600 dark:text-gray-400">FcDocument</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <IconResolver iconName="FcCalendar" className="h-8 w-8" />
              <span className="text-xs text-gray-600 dark:text-gray-400">FcCalendar</span>
            </div>
          </div>
        </div>

        {/* getIconComponent Utility */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">getIconComponent() Utility</h3>
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Synchronous utility for getting icon components directly. Only works with static/cached icons.
            </p>
            <div className="flex flex-wrap gap-4">
              {(() => {
                const HomeIcon = getIconComponent("Home");
                const SettingsIcon = getIconComponent("Settings");
                const ZapIcon = getIconComponent("Zap");
                return (
                  <>
                    <HomeIcon className="h-6 w-6 text-blue-500" />
                    <SettingsIcon className="h-6 w-6 text-green-500" />
                    <ZapIcon className="h-6 w-6 text-yellow-500" />
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Bundle Size Info */}
        <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Bundle Size Impact</h3>
          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <p>✅ <strong>Before:</strong> <code className="px-1 py-0.5 bg-white dark:bg-gray-800 rounded">import * as LucideIcons</code> = ~600KB per file</p>
            <p>✅ <strong>After:</strong> IconResolver = ~50KB shared across all files</p>
            <p>✅ <strong>Result:</strong> 99% reduction in icon-related bundle size</p>
            <p className="mt-2 text-xs">
              <strong>How it works:</strong> 140+ common icons are statically imported. Rare icons load dynamically once and are cached forever.
            </p>
          </div>
        </div>
      </div>
    </ComponentDisplayWrapper>
  );
}

