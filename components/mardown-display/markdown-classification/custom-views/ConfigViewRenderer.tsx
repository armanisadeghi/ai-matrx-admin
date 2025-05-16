"use client";

import React, { Suspense, useState } from 'react';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui";
import { 
  getConfigTypeFromKey, 
  getAvailableViewsForConfigType, 
  getViewForConfig, 
  ConfigViewType 
} from './registry';

interface ConfigViewRendererProps {
  configKey: string;
  data: any;
}

const ViewSkeleton = () => (
  <div className="animate-pulse space-y-4 p-4 w-full">
    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
    <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
    <div className="space-y-2">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
    </div>
  </div>
);

// Simple error boundary component
class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Error rendering view</h3>
          <p className="text-red-600 dark:text-red-400 font-mono text-sm whitespace-pre-wrap">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-sm rounded hover:bg-red-200 dark:hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ConfigViewRenderer: React.FC<ConfigViewRendererProps> = ({ configKey, data }) => {
  const configType = getConfigTypeFromKey(configKey);
  const availableViews = configType ? getAvailableViewsForConfigType(configType) : [];
  const [selectedView, setSelectedView] = useState<ConfigViewType>(availableViews[0] || 'default');
  
  if (!configType) {
    return (
      <div className="p-4 w-full text-red-500 dark:text-red-400">
        Configuration type not found for key: {configKey}
      </div>
    );
  }
  
  if (availableViews.length === 0) {
    return (
      <div className="p-4 w-full text-amber-500 dark:text-amber-400">
        No views available for configuration type: {configType}
      </div>
    );
  }
  
  const viewEntry = getViewForConfig(configType, selectedView);
  
  if (!viewEntry) {
    return (
      <div className="p-4 w-full text-red-500 dark:text-red-400">
        View not found for configuration type: {configType}, view type: {selectedView}
      </div>
    );
  }
  
  // Make sure data has the expected structure
  if (!data || !data.extracted) {
    return (
      <div className="p-4 w-full text-red-500 dark:text-red-400">
        Invalid data format. Expected an object with an 'extracted' property.
        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 text-xs overflow-auto rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }
  
  const ViewComponent = viewEntry.component;
  
  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="flex-shrink-0 p-2">
        {availableViews.length > 1 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Select view:</p>
            <Select value={selectedView} onValueChange={setSelectedView}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select a view" />
              </SelectTrigger>
              <SelectContent>
                {availableViews.map((viewType) => {
                  const entry = getViewForConfig(configType, viewType);
                  return entry ? (
                    <SelectItem key={viewType} value={viewType}>
                      {entry.name}
                      {entry.description && (
                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                          - {entry.description}
                        </span>
                      )}
                    </SelectItem>
                  ) : null;
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <div className="flex-grow">
        <Suspense fallback={<ViewSkeleton />}>
          <ViewErrorBoundary>
            <ViewComponent data={data} />
          </ViewErrorBoundary>
        </Suspense>
      </div>
    </div>
  );
};

export default ConfigViewRenderer; 