import React, { useState, useEffect, useCallback } from 'react';
import CompactTable from '@/components/matrx/CompactTable';

export interface TabConfig {
  id: string;
  label: string;
  type: 'table' | 'text' | 'custom';
  data?: any;
  content?: string;
  render?: () => React.ReactNode;
  onRefresh?: () => void;
  refreshInterval?: number;
}

export interface DebugTabsProps {
  tabs: TabConfig[];
  defaultActiveTab?: string;
  className?: string;
  refreshIntervals?: boolean;
}

export const DebugTabs: React.FC<DebugTabsProps> = ({
  tabs,
  defaultActiveTab,
  className = '',
  refreshIntervals = true,
}) => {
  const [activeView, setActiveView] = useState<string>(defaultActiveTab || tabs[0]?.id || '');

  // Setup refresh interval for active tab
  useEffect(() => {
    if (!refreshIntervals) return;

    const currentTab = tabs.find(tab => tab.id === activeView);
    if (!currentTab?.onRefresh || !currentTab?.refreshInterval) return;

    const interval = setInterval(currentTab.onRefresh, currentTab.refreshInterval);
    return () => clearInterval(interval);
  }, [activeView, tabs, refreshIntervals]);

  const handleTabClick = useCallback((tabId: string) => {
    setActiveView(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.onRefresh) {
      tab.onRefresh();
    }
  }, [tabs]);

  const renderTabContent = (tab: TabConfig) => {
    switch (tab.type) {
      case 'table':
        return <CompactTable data={tab.data} />;
      case 'text':
        return (
          <div className="w-full">
            <div className="text-xs font-medium mb-1">Content:</div>
            <div className="text-xs font-mono bg-muted/30 p-2 rounded">
              {tab.content || 'No content'}
            </div>
          </div>
        );
      case 'custom':
        return tab.render?.();
      default:
        return null;
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeView);

  return (
    <div className={`bg-background border-b ${className}`}>
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              px-3 py-1 text-xs font-medium transition-colors
              ${activeView === tab.id 
                ? 'border-b-2 border-primary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-2">
        {activeTab && renderTabContent(activeTab)}
      </div>
    </div>
  );
};

export default DebugTabs;