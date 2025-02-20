import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMeasure } from "@uidotdev/usehooks";

export interface TabConfig {
  value: string;
  label: string;
}

const TabTrigger = ({ value, label, active }: { value: string; label: string; active: boolean }) => {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "pb-2 px-0 data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white rounded-none whitespace-nowrap",
        active
          ? "text-gray-900 hover:text-gray-900 hover:border-b-2 border-blue-500 dark:hover:text-gray-100"
          : "text-gray-800 dark:text-gray-200 hover:text-gray-900 hover:border-b-2 border-blue-500 dark:hover:text-gray-100"
      )}
    >
      {label}
    </TabsTrigger>
  );
};

export interface TabListProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  config: TabConfig[];
}

export const HeaderTabGroup = ({ 
  activeTab, 
  setActiveTab, 
  config, 
}: TabListProps) => {
  // Use measure hook for container width
  const [containerRef, { width: containerWidth }] = useMeasure();
  
  // State for visible and overflow tabs
  const [visibleTabs, setVisibleTabs] = useState<TabConfig[]>(config);
  const [overflowTabs, setOverflowTabs] = useState<TabConfig[]>([]);
  
  // Constants
  const GAP_SIZE = 32; // 8 in gap-8 class = 32px
  const MORE_BUTTON_WIDTH = 100; // Approximate width for "More" dropdown
  const CHAR_WIDTH = 8; // Character width approximation (in pixels)
  const MIN_TAB_WIDTH = 50; // Minimum width for any tab
  
  // Estimate tab width based on text length
  const estimateTabWidth = (label: string) => {
    return Math.max(label.length * CHAR_WIDTH, MIN_TAB_WIDTH);
  };
  
  // Calculate visible and overflow tabs when container width changes
  useEffect(() => {
    if (!containerWidth) return;
    
    // Make sure the active tab is included first
    const activeTabConfig = config.find(tab => tab.value === activeTab);
    const otherTabs = config.filter(tab => tab.value !== activeTab);
    
    let availableWidth = containerWidth - MORE_BUTTON_WIDTH;
    let currentWidth = 0;
    const visible: TabConfig[] = [];
    
    // Add active tab first
    if (activeTabConfig) {
      const activeTabWidth = estimateTabWidth(activeTabConfig.label);
      currentWidth += activeTabWidth;
      visible.push(activeTabConfig);
    }
    
    // Add other tabs if they fit
    for (const tab of otherTabs) {
      const tabWidth = estimateTabWidth(tab.label);
      // Add gap width between tabs
      if (visible.length > 0) currentWidth += GAP_SIZE;
      
      if (currentWidth + tabWidth <= availableWidth) {
        currentWidth += tabWidth;
        visible.push(tab);
      } else {
        // We've run out of space, remaining tabs go to overflow
        break;
      }
    }
    
    // Set overflow tabs
    const overflow = config.filter(tab => !visible.includes(tab));
    
    // Don't show the More dropdown if all tabs fit
    if (overflow.length === 0) {
      setVisibleTabs(config);
      setOverflowTabs([]);
    } else {
      setVisibleTabs(visible);
      setOverflowTabs(overflow);
    }
    
  }, [containerWidth, config, activeTab]);
  
  return (
    <div className="relative w-full" ref={containerRef}>
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value)} 
        className="w-full"
      >
        <TabsList className="bg-transparent border-b-0 w-full justify-start gap-8 relative z-10">
          {visibleTabs.map((tab) => (
            <TabTrigger 
              key={tab.value} 
              value={tab.value} 
              label={tab.label} 
              active={activeTab === tab.value} 
            />
          ))}
          
          {overflowTabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center pb-2 text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                <MoreHorizontal size={20} />
                <span className="ml-1">More</span>
                <ChevronDown size={16} className="ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {overflowTabs.map((tab) => (
                  <DropdownMenuItem 
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      "cursor-pointer",
                      activeTab === tab.value && "bg-gray-100 dark:bg-gray-800 font-medium"
                    )}
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TabsList>
      </Tabs>
      {/* Border that extends fully */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
};

export default HeaderTabGroup;