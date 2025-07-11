import React, { useEffect } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import OpenContainerGroup from "@/features/applet/runner/layouts/core/OpenContainerGroup";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const CarouselSearchLayout: React.FC<AppletInputProps> = ({
  appletId,
  activeContainerId,
  setActiveContainerId,
  actionButton,
  className = "",
  isMobile = false,
  source = "applet",
}) => {
  const appletContainers = useAppSelector(state => selectAppletRuntimeContainers(state, appletId));
  
  // Find the active container index based on the activeContainerId
  const activeIndex = activeContainerId 
    ? appletContainers.findIndex(container => container.id === activeContainerId)
    : 0;
  
  // Set the first container as active if nothing is selected
  useEffect(() => {
    if (!activeContainerId && appletContainers.length > 0) {
      setActiveContainerId(appletContainers[0].id);
    }
  }, [activeContainerId, appletContainers, setActiveContainerId]);

  const handlePrev = () => {
    const newIndex = activeIndex <= 0 ? appletContainers.length - 1 : activeIndex - 1;
    setActiveContainerId(appletContainers[newIndex].id);
  };

  const handleNext = () => {
    const newIndex = activeIndex >= appletContainers.length - 1 ? 0 : activeIndex + 1;
    setActiveContainerId(appletContainers[newIndex].id);
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      <div className="relative">
        <div className="overflow-hidden">
          <div 
            className="transition-transform duration-300 ease-in-out flex"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {appletContainers.map((container) => (
              <div key={container.id} className="w-full flex-shrink-0">
                <OpenContainerGroup
                  id={container.id}
                  label={container.label}
                  description={container.description}
                  fields={container.fields}
                  appletId={appletId}
                  isActive={true}
                  onClick={() => {}}
                  onOpenChange={() => {}}
                  isLast={false}
                  isMobile={isMobile}
                  className="h-full"
                  source={source}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Navigation arrows */}
        <button 
          onClick={handlePrev}
          className="absolute top-1/2 left-0 transform -translate-y-1/2 -ml-5 bg-white dark:bg-gray-700 rounded-full w-10 h-10 shadow-lg flex items-center justify-center text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
          aria-label="Previous container"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <button 
          onClick={handleNext}
          className="absolute top-1/2 right-0 transform -translate-y-1/2 -mr-5 bg-white dark:bg-gray-700 rounded-full w-10 h-10 shadow-lg flex items-center justify-center text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
          aria-label="Next container"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      
      {/* Dots indicator */}
      <div className="flex justify-center mt-4 space-x-2">
        {appletContainers.map((container, index) => (
          <button
            key={index}
            onClick={() => setActiveContainerId(container.id)}
            className={`w-3 h-3 rounded-full focus:outline-none ${
              index === activeIndex 
                ? "bg-rose-500" 
                : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
            }`}
            aria-label={`Go to container ${index + 1}`}
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