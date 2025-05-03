"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appletLayoutOptionsArray } from "@/features/applet/layouts/options/layout-options";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";
import { appletBuilderSlice } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { selectAppletLayoutType } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

interface AppletLayoutSelectionProps {
  appletId: string;
  className?: string;
  label?: string;
}

export function AppletLayoutSelection({
  appletId,
  className = "",
  label = "Layout"
}: AppletLayoutSelectionProps) {
  const dispatch = useAppDispatch();
  
  // Select the current layout from the store using the proper selector
  const currentLayout = useAppSelector(state => selectAppletLayoutType(state, appletId)) || "open";

  // Handle layout change
  const handleLayoutChange = (value: string) => {
    dispatch(appletBuilderSlice.actions.setLayoutType({
      id: appletId,
      layoutType: value as AppletLayoutOption
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
        <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <SelectValue placeholder="Select a layout" />
        </SelectTrigger>
        <SelectContent>
          {appletLayoutOptionsArray.map(layout => (
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
