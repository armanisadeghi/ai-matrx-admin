"use client";
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Component for content type tabs with horizontal scrolling for mobile
 */
const ContentTabs = ({ activeTab, setActiveTab }) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const tabsRef = React.useRef(null);

  const scrollTabs = (direction) => {
    if (tabsRef.current) {
      const container = tabsRef.current;
      const scrollAmount = direction === "left" ? -200 : 200;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setScrollPosition(container.scrollLeft + scrollAmount);
    }
  };

  return (
    <div className="relative w-full">
      {/* Scroll buttons visible on smaller screens */}
      <button 
        onClick={() => scrollTabs("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md md:hidden"
        aria-label="Scroll left"
      >
        <ChevronLeft size={18} />
      </button>
      
      <TabsList 
        ref={tabsRef}
        className="flex border-b border-gray-200 dark:border-gray-700 gap-1 overflow-x-auto scrollbar-hide py-1 px-6 md:px-0"
      >
        <TabsTrigger value="reader">Reader</TabsTrigger>
        <TabsTrigger value="organized">Organized Content</TabsTrigger>
        <TabsTrigger value="structured">Structured Data</TabsTrigger>
        <TabsTrigger value="text">Text Content</TabsTrigger>
        <TabsTrigger value="metadata">Metadata</TabsTrigger>
        <TabsTrigger value="removals">Filter Details</TabsTrigger>
        <TabsTrigger value="seo-analysis">SEO Analysis</TabsTrigger>
        <TabsTrigger value="hashes">Hashes</TabsTrigger>
        <TabsTrigger value="raw">Raw</TabsTrigger>
        <TabsTrigger value="raw-explorer">Explorer</TabsTrigger>
        <TabsTrigger value="fancy-json-explorer">Fancy Explorer</TabsTrigger>
        <TabsTrigger value="bookmark-viewer">Bookmark Viewer</TabsTrigger>
      </TabsList>
      
      <button 
        onClick={() => scrollTabs("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md md:hidden"
        aria-label="Scroll right"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default ContentTabs;

// Optional: Add this to your global CSS to hide scrollbars but maintain functionality
// .scrollbar-hide::-webkit-scrollbar {
//   display: none;
// }
// .scrollbar-hide {
//   -ms-overflow-style: none;
//   scrollbar-width: none;
// }