import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TabConfig {
  value: string;
  label: string;
  icon?: React.ReactNode; // Optional icon for each tab
}

export interface MobileTabHeaderProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  config: TabConfig[];
}

export const MobileTabHeader = ({
  activeTab,
  setActiveTab,
  config,
}: MobileTabHeaderProps) => {
  // Find the active tab configuration
  const activeTabConfig = config.find(tab => tab.value === activeTab);
  
  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 dark:border-gray-700">
        {/* Left side - Current selected tab */}
        <div className="flex items-center">
          {activeTabConfig?.icon && (
            <span className="mr-2">{activeTabConfig.icon}</span>
          )}
          <span className="font-medium text-gray-900 dark:text-white">
            {activeTabConfig?.label || "Select Tab"}
          </span>
        </div>
        
        {/* Right side - Dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center text-gray-700 dark:text-gray-300 focus:outline-none">
            <Menu size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {config.map((tab) => (
              <DropdownMenuItem
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "cursor-pointer flex items-center",
                  activeTab === tab.value && "bg-gray-100 dark:bg-gray-800 font-medium"
                )}
              >
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Alternative version with active indicator
export const MobileTabHeaderWithIndicator = ({
  activeTab,
  setActiveTab,
  config,
}: MobileTabHeaderProps) => {
  const activeTabConfig = config.find(tab => tab.value === activeTab);
  
  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between px-2 py-1">
        {/* Left side - Current selected tab with active indicator */}
        <div className="flex items-center">
          {activeTabConfig?.icon && (
            <span className="mr-2">{activeTabConfig.icon}</span>
          )}
          <span className="font-medium text-gray-900 dark:text-white border-b-2 border-blue-500 py-1">
            {activeTabConfig?.label || "Select Tab"}
          </span>
        </div>
        
        {/* Right side - Dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center text-gray-700 dark:text-gray-300 focus:outline-none">
            <Menu size={18} />
            <ChevronDown size={14} className="ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {config.map((tab) => (
              <DropdownMenuItem
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "cursor-pointer flex items-center",
                  activeTab === tab.value && "bg-gray-100 dark:bg-gray-800 font-medium"
                )}
              >
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Bottom border that extends fully */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
};

export default MobileTabHeader;