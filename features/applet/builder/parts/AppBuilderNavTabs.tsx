'use client';

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, RefreshCw, Save } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TabItem {
  value: string;
  label: string;
  onClick?: () => void;
}

interface AppBuilderNavTabsProps {
  currentMode: string;
  tabs: TabItem[];
  hasUnsavedChanges?: boolean;
  unsavedItemsCount?: number;
  onRefresh?: () => void;
  onCreate?: () => void;
  onUnsavedChanges?: () => void;
}

export function AppBuilderNavTabs({
  currentMode,
  tabs,
  hasUnsavedChanges = false,
  unsavedItemsCount = 0,
  onRefresh,
  onCreate,
  onUnsavedChanges,
}: AppBuilderNavTabsProps) {
  const isMobile = useIsMobile();

  return (
    <Tabs value={currentMode} className="w-full">
      <div className="flex items-center justify-between">
        {isMobile && tabs.length > 3 ? (
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {tabs.find(tab => tab.value === currentMode)?.label || "Menu"} <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {tabs.map(tab => (
                  <DropdownMenuItem key={tab.value} onClick={tab.onClick}>
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <TabsList className="bg-transparent p-1 rounded-lg">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                onClick={tab.onClick}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && onUnsavedChanges && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onUnsavedChanges}
              className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-800/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            >
              <Save className="h-4 w-4 mr-2" />
              Unsaved Changes ({unsavedItemsCount})
            </Button>
          )}
          {onRefresh && (
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {onCreate && (
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" size="sm" onClick={onCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Tabs>
  );
} 