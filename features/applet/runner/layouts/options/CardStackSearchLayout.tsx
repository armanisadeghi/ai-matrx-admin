import React, { useContext, useEffect } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import OpenContainerGroup from "@/features/applet/runner/layouts/core/OpenContainerGroup";
import UniformHeightWrapper, { UniformHeightContext } from "@/features/applet/runner/layouts/core/UniformHeightWrapper";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const CardStackSearchLayout: React.FC<AppletInputProps> = ({
  appletId,
  activeContainerId,
  setActiveContainerId,
  actionButton,
  className = "",
  source = "applet",
}) => {
  const { getMaxHeight } = useContext(UniformHeightContext);
  const appletContainers = useAppSelector(state => selectAppletRuntimeContainers(state, appletId));

  // Find the active container index based on activeContainerId
  const activeIndex = activeContainerId 
    ? appletContainers.findIndex(container => container.id === activeContainerId)
    : 0;
  
  // Set the first container as active if nothing is selected
  useEffect(() => {
    if (!activeContainerId && appletContainers.length > 0) {
      setActiveContainerId(appletContainers[0].id);
    }
  }, [activeContainerId, appletContainers, setActiveContainerId]);

  // Calculate the position and z-index for each card
  const getCardStyle = (index: number) => {
    const isActive = index === activeIndex;
    const position = index - activeIndex;
    
    // Cards behind the active card
    if (position < 0) {
      return {
        transform: `translateY(${Math.abs(position) * 20}px) scale(${1 - Math.abs(position) * 0.08})`,
        zIndex: 10 + position,
        opacity: 1 - Math.abs(position) * 0.08,
        filter: `brightness(${1 - Math.abs(position) * 0.15})`,
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
      };
    }
    // Active card
    else if (position === 0) {
      return {
        transform: "translateY(0) scale(1)",
        zIndex: 20,
        opacity: 1,
        filter: "brightness(1)",
        boxShadow: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`,
      };
    }
    // Cards ahead of the active card
    else {
      return {
        transform: `translateY(${-position * 10}px) scale(${1 - position * 0.08})`,
        zIndex: 10 - position,
        opacity: 0.7 - position * 0.15,
        filter: `brightness(${1 - position * 0.08})`,
        pointerEvents: "none",
        boxShadow: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)`,
      };
    }
  };

  const handleNext = () => {
    if (activeIndex < appletContainers.length - 1) {
      const nextContainer = appletContainers[activeIndex + 1];
      setActiveContainerId(nextContainer.id);
    }
  };
  
  const handlePrev = () => {
    if (activeIndex > 0) {
      const prevContainer = appletContainers[activeIndex - 1];
      setActiveContainerId(prevContainer.id);
    }
  };

  const isLastCard = activeIndex === appletContainers.length - 1;
  const isFirstCard = activeIndex === 0;
  
  // Get the maximum height from UniformHeightContext for cardStack layout
  const maxContentHeight = getMaxHeight("cardStack");
  // Add some padding to ensure there's enough space
  const containerHeight = maxContentHeight > 0 ? maxContentHeight + 40 : 'auto';

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 pb-16 ${className}`}>
      {/* Stepper navigation */}
      <div className="flex mb-6">
        {appletContainers.map((container, index) => (
          <div 
            key={container.id}
            className={`flex-1 text-center ${
              index < activeIndex 
                ? "text-rose-600 dark:text-rose-400" 
                : index === activeIndex 
                  ? "text-rose-500 dark:text-rose-400 font-bold" 
                  : "text-gray-400 dark:text-gray-500"
            }`}
          >
            <button
              onClick={() => setActiveContainerId(container.id)}
              className={`rounded-full w-8 h-8 mx-auto mb-2 flex items-center justify-center ${
                index <= activeIndex 
                  ? "bg-rose-500 text-white hover:bg-rose-600" 
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {index + 1}
            </button>
            <button 
              onClick={() => setActiveContainerId(container.id)}
              className="text-sm hover:underline focus:outline-none text-gray-700 dark:text-gray-300"
            >
              {container.label}
            </button>
          </div>
        ))}
      </div>

      <div className="relative" style={{ minHeight: containerHeight }}>
        {appletContainers.map((container, index) => (
          <div
            key={container.id}
            className="absolute w-full transition-all duration-500 ease-in-out cursor-pointer rounded-lg overflow-hidden"
            style={{
              ...getCardStyle(index),
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: "auto"
            }}
            onClick={() => setActiveContainerId(container.id)}
          >
            <UniformHeightWrapper
              containerId={container.id}
              layoutType="cardStack"
              className="w-full"
              enabled={true}
            >
              <OpenContainerGroup
                id={container.id}
                label={container.label}
                description={container.description}
                fields={container.fields}
                appletId={appletId}
                isActive={index === activeIndex}
                onClick={() => {}}
                onOpenChange={() => {}}
                isLast={false}
                isMobile={false}
                source={source}
                className="shadow-xl border-2 border-gray-200 dark:border-gray-700 rounded-lg"
              />
            </UniformHeightWrapper>
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button 
          onClick={handlePrev}
          disabled={isFirstCard}
          className={`px-4 py-2 rounded-md ${
            isFirstCard 
              ? "bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Previous
        </button>
        
        {isLastCard ? (actionButton ) : (
          <button 
            onClick={handleNext}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-md"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default CardStackSearchLayout;