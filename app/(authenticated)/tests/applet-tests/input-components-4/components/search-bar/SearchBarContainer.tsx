// SearchBarContainer.tsx
import React, { ReactNode, useState } from 'react';

export interface SearchTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface SearchBarContainerProps {
  tabs: SearchTab[];
  logo?: ReactNode;
  defaultTab?: string;
  rightNav?: ReactNode;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

const SearchBarContainer: React.FC<SearchBarContainerProps> = ({
  tabs,
  logo,
  defaultTab,
  rightNav,
  onTabChange,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<string>(defaultTab || (tabs.length > 0 ? tabs[0].id : ''));

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <div className={`w-full bg-white dark:bg-gray-900 shadow-md rounded-xl border dark:border-gray-800 ${className}`}>
      {/* Header with logo, tabs and right navigation */}
      <div className="flex items-center border-b dark:border-gray-800">
        {logo && (
          <div className="flex items-center py-3 px-4 mr-4">
            {logo}
          </div>
        )}
        
        <div className="flex-grow flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`py-4 px-6 flex items-center gap-2 text-sm font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        {rightNav && (
          <div className="mr-4">
            {rightNav}
          </div>
        )}
      </div>
      
      {/* Content area */}
      <div className="py-2">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default SearchBarContainer;