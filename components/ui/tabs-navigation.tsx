'use client';

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabItem = {
  id: string;
  label: string;
  href: string;
};

interface TabsNavigationProps {
  tabs: TabItem[];
  activeId?: string;
  className?: string;
  centered?: boolean;
}

const TabsNavigation: React.FC<TabsNavigationProps> = ({
  tabs,
  activeId,
  className = "",
  centered = true,
}) => {
  const pathname = usePathname();
  const tabsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
  }, [tabs]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      const newPosition = direction === 'left' 
        ? tabsRef.current.scrollLeft - scrollAmount 
        : tabsRef.current.scrollLeft + scrollAmount;
      
      tabsRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      
      setTimeout(checkForOverflow, 300);
    }
  };

  // Determine active tab based on current path or provided activeId
  const getActiveTabId = () => {
    if (activeId) return activeId;
    
    // Find the tab with the most specific path match
    const matchingTab = tabs
      .filter(tab => pathname.includes(tab.href))
      .sort((a, b) => b.href.length - a.href.length)[0];
    
    return matchingTab?.id;
  };

  const activeTabId = getActiveTabId();

  return (
    <div ref={containerRef} className={`w-full relative ${centered ? 'flex justify-center' : ''} ${className}`}>
      <div className={`relative ${centered ? 'max-w-3xl' : 'w-full'}`}>
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
          className="flex mb-4 overflow-x-auto scrollbar-none"
          onScroll={checkForOverflow}
        >          
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap relative ${
                tab.id === activeTabId
                  ? "text-rose-500"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              }`}
            >
              {tab.label}
              {/* Only active tab gets the rose colored border */}
              {tab.id === activeTabId && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"></div>
              )}
            </Link>
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
    </div>
  );
};

export default TabsNavigation; 