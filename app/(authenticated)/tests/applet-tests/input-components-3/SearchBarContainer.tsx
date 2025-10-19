// SearchBarContainer.jsx
import React, { useState } from 'react';
import { Globe, Menu } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';

const SearchBarContainer = ({ 
  tabs, 
  logo,
  rightNav = null,
  defaultTab,
  customTabsList = null,
  onTabChange
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);
  
  const handleTabChange = (value) => {
    setActiveTab(value);
    if (onTabChange) {
      onTabChange(value);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-textured transition-colors">
      {/* Top Navigation */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center">
          <div className="text-rose-500 dark:text-rose-400 mr-12">
            {logo}
          </div>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-64">
            <TabsList className="bg-transparent border-b border-gray-200 dark:border-gray-700 w-full justify-start gap-8">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id} 
                  className="pb-2 px-0 data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white rounded-none text-gray-800 dark:text-gray-200"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        {rightNav || (
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-4 py-2 text-gray-800 dark:text-gray-200">
              List your place
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Globe size={20} />
            </button>
            <div className="flex items-center border rounded-full p-1 shadow-sm hover:shadow-md transition dark:border-gray-700 bg-textured">
              <Menu size={18} className="ml-2 text-gray-600 dark:text-gray-400" />
              <div className="w-8 h-8 bg-gray-500 dark:bg-gray-600 rounded-full ml-3"></div>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mt-2 mb-6 relative">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex rounded-full border shadow-sm overflow-hidden bg-textured dark:border-gray-700">
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="w-full m-0 p-0">
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default SearchBarContainer;