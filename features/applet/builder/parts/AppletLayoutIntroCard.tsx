"use client";

import React from "react";
import { appletLayoutOptions } from "@/features/applet/constants/layout-options";
import { AppletLayoutOption } from "@/types/customAppTypes";

interface AppletLayoutIntroCardProps {
  layoutType: AppletLayoutOption;
  className?: string;
}

const AppletLayoutIntroCard = ({ layoutType, className = "" }: AppletLayoutIntroCardProps) => {
  const layoutInfo = appletLayoutOptions[layoutType];

  if (!layoutInfo) {
    return null;
  }

  return (
    <div className="w-full mt-24 mb-24">
      <div className="w-full bg-blue-50 dark:bg-blue-950/40 border-t border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center p-2 max-w-screen-2xl mx-auto">
          <div className="flex-shrink-0 mr-3 w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full">
            {layoutInfo.icon}
          </div>
          <div>
            <h3 className="font-medium text-blue-700 dark:text-blue-300">{layoutInfo.title}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppletLayoutIntroCard;
