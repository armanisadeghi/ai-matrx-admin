import React, { useState } from "react";
import { SearchLayoutProps } from "../types";
import OpenSearchGroup from "../core/OpenSearchGroup";
import UniformHeightWrapper from "./helpers/UniformHeightWrapper";

const CardStackSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  const [activeIndex, setActiveIndex] = useState(0);

  // Calculate the position and z-index for each card
  const getCardStyle = (index: number) => {
    const isActive = index === activeIndex;
    const position = index - activeIndex;
    
    // Cards behind the active card
    if (position < 0) {
      return {
        transform: `translateY(${Math.abs(position) * 15}px) scale(${1 - Math.abs(position) * 0.05})`,
        zIndex: 10 + position,
        opacity: 1 - Math.abs(position) * 0.15,
        filter: `brightness(${1 - Math.abs(position) * 0.1})`,
      };
    }
    // Active card
    else if (position === 0) {
      return {
        transform: "translateY(0) scale(1)",
        zIndex: 20,
        opacity: 1,
        filter: "brightness(1)",
      };
    }
    // Cards ahead of the active card
    else {
      return {
        transform: `translateY(${-position * 10}px) scale(${1 - position * 0.05})`,
        zIndex: 10 - position,
        opacity: 0.7 - position * 0.1,
        filter: `brightness(${1 - position * 0.05})`,
        pointerEvents: "none",
      };
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 pb-16 ${className}`}>
      <div className="relative h-[500px]">
        {activeSearchGroups.map((group, index) => (
          <div
            key={group.id}
            className="absolute w-full transition-all duration-500 ease-in-out cursor-pointer"
            style={{
              ...getCardStyle(index),
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: "auto"
            }}
            onClick={() => setActiveIndex(index)}
          >
            <UniformHeightWrapper
              groupId={group.id}
              layoutType="cardStack"
              className="h-full"
            >
              <OpenSearchGroup
                id={group.id}
                label={group.label}
                placeholder={group.placeholder}
                description={group.description}
                fields={group.fields}
                isActive={index === activeIndex}
                onClick={() => {}}
                onOpenChange={() => {}}
                isLast={false}
                isMobile={false}
                className="h-full shadow-xl"
              />
            </UniformHeightWrapper>
          </div>
        ))}
      </div>

      {/* Navigation indicator */}
      <div className="flex justify-center mt-6 items-center space-x-2">
        {activeSearchGroups.map((group, index) => (
          <button
            key={group.id}
            onClick={() => setActiveIndex(index)}
            className={`px-3 py-1 rounded-full transition-all ${
              index === activeIndex
                ? "bg-rose-500 text-white font-medium px-4"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center mt-8">
        {actionButton || (
          <button className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-full px-8 py-3 shadow-lg">
            Search
          </button>
        )}
      </div>
    </div>
  );
};

export default CardStackSearchLayout;