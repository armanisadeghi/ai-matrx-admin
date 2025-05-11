// File: features/applet/runner/layouts/options/TabsSearchLayout.tsx
import React, { useState, useRef, useEffect } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import OpenContainerGroup from "@/features/applet/runner/layouts/core/OpenContainerGroup";
import UniformHeightWrapper from "@/features/applet/runner/layouts/core/UniformHeightWrapper";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const TabsSearchLayout: React.FC<AppletInputProps> = ({
  appletId,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
  isMobile = false,
}) => {
  const appletContainers = useAppSelector(state => selectAppletRuntimeContainers(state, appletId))
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [previousGroupIndex, setPreviousGroupIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const checkForOverflow = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftIndicator(scrollLeft > 0);
      setShowRightIndicator(scrollLeft + clientWidth < scrollWidth);
    }
  };

  useEffect(() => {
    checkForOverflow();
    window.addEventListener('resize', checkForOverflow);
    return () => window.removeEventListener('resize', checkForOverflow);
  }, [appletContainers]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200; // Adjust as needed
      const newPosition = direction === 'left' 
        ? tabsRef.current.scrollLeft - scrollAmount 
        : tabsRef.current.scrollLeft + scrollAmount;
      
      tabsRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      
      // Update indicators after scroll
      setTimeout(checkForOverflow, 300);
    }
  };

  const handleTabChange = (index: number) => {
    if (index !== activeGroupIndex) {
      setPreviousGroupIndex(activeGroupIndex);
      setIsTransitioning(true);
      setActiveGroupIndex(index);
      
      // Reset the transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      <div className="relative">
        {/* Left fade indicator with button */}
        {showLeftIndicator && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
            <button 
              onClick={() => scrollTabs('left')}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 shadow-md hover:bg-white hover:dark:bg-gray-700 focus:outline-none"
              aria-label="Scroll tabs left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none"></div>
          </div>
        )}
        
        <div 
          ref={tabsRef}
          className="flex mb-4 overflow-x-auto scrollbar-none relative"
          onScroll={checkForOverflow}
        >          
          {appletContainers.map((container, index) => (
            <button
              key={container.id}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap relative ${
                index === activeGroupIndex
                  ? "text-rose-500"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              }`}
              onClick={() => handleTabChange(index)}
            >
              {container.label}
              {/* Only active tab gets the rose colored border */}
              {index === activeGroupIndex && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"></div>
              )}
            </button>
          ))}
        </div>

        {/* Right fade indicator with button */}
        {showRightIndicator && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center">
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none"></div>
            <button 
              onClick={() => scrollTabs('right')}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 shadow-md hover:bg-white hover:dark:bg-gray-700 focus:outline-none"
              aria-label="Scroll tabs right"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        )}
      </div>
      
      <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 relative">
        {appletContainers.map((container, index) => {
          const isActive = index === activeGroupIndex;
          const isPrevious = isTransitioning && index === previousGroupIndex;
          
          return (
            <UniformHeightWrapper
              key={container.id}
              groupId={container.id}
              layoutType="tabs"
              className={`transition-all duration-300 ${
                isActive 
                  ? 'opacity-100 visible z-20' 
                  : isPrevious
                    ? 'opacity-0 visible z-10 absolute top-0 left-0 w-full'
                    : 'opacity-0 invisible absolute top-0 left-0 w-full'
              }`}
            >
              <OpenContainerGroup
                id={container.id}
                label={container.label}
                description={container.description}
                fields={container.fields}
                appletId={appletId}
                isActive={true}
                onClick={() => {}}
                onOpenChange={() => {}}
                isLast={true}
                isMobile={isMobile}
                className="border-0"
              />
            </UniformHeightWrapper>
          );
        })}
      </div>
      
      <div className="flex justify-between mt-6">
        <button
          onClick={() => {
            const newIndex = Math.max(0, activeGroupIndex - 1);
            handleTabChange(newIndex);
          }}
          disabled={activeGroupIndex === 0}
          className={`px-4 py-2 rounded-md ${
            activeGroupIndex === 0
              ? "bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Previous
        </button>
        
        {activeGroupIndex === appletContainers.length - 1 ? (actionButton) : (
          <button
            onClick={() => {
              const newIndex = Math.min(activeGroupIndex + 1, appletContainers.length - 1);
              handleTabChange(newIndex);
            }}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-md"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default TabsSearchLayout;
