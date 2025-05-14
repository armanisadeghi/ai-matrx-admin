import React, { useState } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import { AppletFieldController } from "@/features/applet/runner/fields/AppletFieldController";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const MinimalistSearchLayout: React.FC<AppletInputProps> = ({
  appletId,
  activeContainerId,
  setActiveContainerId,
  actionButton,
  className = "",
  source = "applet",
}) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const appletContainers = useAppSelector(state => selectAppletRuntimeContainers(state, appletId))
  return (
    <div className={`w-full max-w-5xl mx-auto p-4 ${className}`}>
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-8">
        <h2 className="text-2xl font-light text-center">What are you looking for?</h2>
      </div>
      
      <div className="space-y-10">
        {appletContainers.map((container) => {
          const isExpanded = expandedGroup === container.id;
          
          return (
            <div key={container.id} className="transition-all duration-300">
              <div 
                className="flex items-center cursor-pointer py-3 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setExpandedGroup(isExpanded ? null : container.id)}
              >
                <h3 className="text-xl font-light text-gray-800 dark:text-gray-200 flex-grow">{container.label}</h3>
                <div className={`transform transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
              
              <div 
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  isExpanded ? "max-h-[1000px] opacity-100 mt-6" : "max-h-0 opacity-0"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {container.fields.map((field) => (
                    <div key={field.id} className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        {field.label}
                      </label>
                      {AppletFieldController({ field, appletId, isMobile: false, source })}
                      {field.helpText && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-center mt-12">
        {actionButton}
      </div>
    </div>
  );
};

export default MinimalistSearchLayout;