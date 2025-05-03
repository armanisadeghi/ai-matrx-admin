'use client';
import React, { useRef } from 'react';
import { CustomAppletConfig } from '@/features/applet/builder/builder.types';
import AppletPreviewCard from '@/features/applet/builder/previews/AppletPreviewCard';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface AppletCarouselProps {
  applets: CustomAppletConfig[];
  onAppletClick?: (applet: CustomAppletConfig) => void;
}

const AppletCarousel: React.FC<AppletCarouselProps> = ({ applets, onAppletClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300; // Scroll by approximately one card width
      const currentScroll = scrollRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative group">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-gray-200 dark:border-gray-700"
        disabled={!scrollRef.current?.scrollLeft}
      >
        <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Scrollable container */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-track-gray-800 dark:scrollbar-thumb-gray-600"
      >
        <div className="flex gap-4 p-1">
          {applets.map((applet, index) => (
            <div key={index} className="flex-none w-72">
              <AppletPreviewCard 
                applet={applet} 
                onClick={() => onAppletClick?.(applet)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-gray-200 dark:border-gray-700"
      >
        <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  );
};

export default AppletCarousel;