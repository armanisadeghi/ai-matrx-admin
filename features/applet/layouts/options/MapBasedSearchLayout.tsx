import React, { useState } from "react";
import { SearchLayoutProps } from "@/features/applet/layouts/options/layout.types";
import OpenSearchGroup from "@/features/applet/layouts/core/OpenSearchGroup";
import { fieldController } from "@/features/applet/runner/components/field-components/FieldController";

const MapBasedSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  return (
    <div className={`w-full h-[600px] ${className}`}>
      <div className="relative w-full h-full flex flex-col">
        {/* Map area (In a real implementation, this would be a map component) */}
        <div className="relative flex-grow bg-gray-200 dark:bg-gray-700 overflow-hidden">
          {/* Simulated map with a grid */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6">
            {Array.from({ length: 48 }).map((_, index) => {
              // Create a deterministic color based on the index
              const hue = (index * 137.508) % 360; // Golden angle approximation
              const saturation = 70 + (index % 20); // Vary saturation between 70-90
              const lightness = 50 + (index % 20); // Vary lightness between 50-70
              const opacity = 0.2 + (index % 10) * 0.02; // Vary opacity between 0.2-0.4
              
              return (
                <div 
                  key={index} 
                  className="border border-gray-300 dark:border-gray-600"
                  style={{ 
                    backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`
                  }}
                />
              );
            })}
          </div>
          
          {/* Map controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button className="bg-white dark:bg-gray-800 rounded-full w-10 h-10 shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20v-8"/>
                <path d="M12 12l-4-4"/>
                <path d="M12 12l4-4"/>
                <path d="M12 4v8"/>
              </svg>
            </button>
            <button className="bg-white dark:bg-gray-800 rounded-full w-10 h-10 shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12H3"/>
                <path d="M12 3v18"/>
              </svg>
            </button>
            <button className="bg-white dark:bg-gray-800 rounded-full w-10 h-10 shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12H3"/>
                <path d="M12 3v18"/>
                <path d="M12 8L8 12M4 16"/>
              </svg>
            </button>
          </div>
          
          {/* Filter button */}
          <button 
            className="absolute bottom-4 right-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center space-x-2 z-10"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Filters</span>
            <span className="bg-white text-rose-500 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
              {activeSearchGroups.reduce((sum, group) => sum + group.fields.length, 0)}
            </span>
          </button>
          
          {/* Map pins (example) */}
          <div className="absolute top-1/4 left-1/3">
            <div className="relative">
              <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs z-10">
                $99
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-rose-500 rotate-45"></div>
            </div>
          </div>
          <div className="absolute top-2/3 right-1/4">
            <div className="relative">
              <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs z-10">
                $149
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-rose-500 rotate-45"></div>
            </div>
          </div>
          <div className="absolute top-1/2 right-1/3">
            <div className="relative">
              <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs z-10">
                $129
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-rose-500 rotate-45"></div>
            </div>
          </div>
          
          {/* Location search bar */}
          <div className="absolute top-4 left-4 w-72">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search location..."
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full py-2 pl-10 pr-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filter panel (slides in from the side) */}
        <div 
          className={`absolute right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 transform ${
            isFilterPanelOpen ? 'translate-x-0' : 'translate-x-full'
          } z-20 overflow-auto`}
        >
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium">Search Filters</h3>
            <button 
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="p-4 space-y-6">
            {activeSearchGroups.map((group) => (
              <div key={group.id} className="border-b dark:border-gray-700 pb-4 last:border-0">
                <h4 className="text-md font-medium mb-3 text-rose-500">{group.label}</h4>
                {group.fields.map((field) => (
                  <div key={field.brokerId} className="mb-4 last:mb-0">
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                      {field.label}
                      </label>
                    <div className="field-control">
                      {fieldController(field, false)}
                    </div>
                    {field.helpText && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t dark:border-gray-700">
            {actionButton || (
              <button className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-lg py-3">
                Apply Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapBasedSearchLayout;