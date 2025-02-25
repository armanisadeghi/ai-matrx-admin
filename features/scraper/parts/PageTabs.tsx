"use client";
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { truncateText, extractPageTitle } from "../utils/scraper-utils";

/**
 * Component for displaying page tabs when multiple pages are available
 */
const PageTabs = ({ responses, activePageIndex, setActivePageIndex }) => {
  if (!responses || responses.length <= 1) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 p-2">
      <Tabs 
        value={String(activePageIndex)} 
        onValueChange={(value) => setActivePageIndex(parseInt(value))}
      >
        <TabsList className="flex flex-wrap gap-1">
          {responses.map((response, idx) => {
            const pageTitle = extractPageTitle(response, idx);
            return (
              <TabsTrigger key={idx} value={String(idx)}>
                {truncateText(pageTitle, 25)}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default PageTabs;