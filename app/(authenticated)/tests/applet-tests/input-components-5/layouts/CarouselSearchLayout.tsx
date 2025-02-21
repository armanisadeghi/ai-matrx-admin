import React, { useState } from "react";
import { SearchLayoutProps } from "../types";
import OpenSearchGroup from "../core/OpenSearchGroup";

const CarouselSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? activeSearchGroups.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === activeSearchGroups.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      <div className="relative">
        <div className="overflow-hidden">
          <div 
            className="transition-transform duration-300 ease-in-out flex"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {activeSearchGroups.map((group) => (
              <div key={group.id} className="w-full flex-shrink-0">
                <OpenSearchGroup
                  id={group.id}
                  label={group.label}
                  placeholder={group.placeholder}
                  description={group.description}
                  fields={group.fields}
                  isActive={true}
                  onClick={() => {}}
                  onOpenChange={() => {}}
                  isLast={false}
                  isMobile={false}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Navigation arrows */}
        <button 
          onClick={handlePrev}
          className="absolute top-1/2 left-0 transform -translate-y-1/2 -ml-5 bg-white dark:bg-gray-700 rounded-full w-10 h-10 shadow-lg flex items-center justify-center text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
          aria-label="Previous group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <button 
          onClick={handleNext}
          className="absolute top-1/2 right-0 transform -translate-y-1/2 -mr-5 bg-white dark:bg-gray-700 rounded-full w-10 h-10 shadow-lg flex items-center justify-center text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
          aria-label="Next group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      
      {/* Dots indicator */}
      <div className="flex justify-center mt-4 space-x-2">
        {activeSearchGroups.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`w-3 h-3 rounded-full focus:outline-none ${
              index === activeIndex 
                ? "bg-rose-500" 
                : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
            }`}
            aria-label={`Go to group ${index + 1}`}
          />
        ))}
      </div>
      
      <div className="flex justify-end mt-6">
        {actionButton || (
          <button className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full px-6 py-3">
            Search
          </button>
        )}
      </div>
    </div>
  );
};

export default CarouselSearchLayout;