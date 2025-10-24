"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { AppLayoutOptions } from "@/types/customAppTypes";
import { appBuilderSlice } from "@/lib/redux/app-builder/slices/appBuilderSlice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { appLayoutOptionsArray } from "../../constants/layout-options";

interface AppLayoutSelectionProps {
  appId: string;
  className?: string;
  label?: string;
}

export function AppLayoutSelection({
  appId,
  className = "",
  label = "App Layout"
}: AppLayoutSelectionProps) {
  const dispatch = useAppDispatch();
  
  // Select the current layout from the store
  const currentLayout = useAppSelector(state => 
    state.appBuilder.apps[appId]?.layoutType || "tabbedApplets"
  );

  // Handle layout change
  const handleLayoutChange = (value: string) => {
    dispatch(appBuilderSlice.actions.updateApp({
      id: appId,
      changes: { layoutType: value as AppLayoutOptions }
    }));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="layoutType" className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label}
      </Label>
      <Select
        value={currentLayout}
        onValueChange={handleLayoutChange}
      >
        <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-textured">
          <SelectValue placeholder="Select a layout" />
        </SelectTrigger>
        <SelectContent>
          {appLayoutOptionsArray.map(layout => (
            <SelectItem key={layout.value} value={layout.value} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300">{layout.icon}</span>
                <span>{layout.title}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
