"use client";
import React, { useState, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { filterContentResponses, isScraperLoading } from "./utils/scraper-utils";
import PageTabs from "./parts/PageTabs";
import PageContent from "./parts/PageContent";

/**
 * Main component for displaying scraper results using utility functions
 */
const ScraperResultsComponent = ({ socketHook }) => {
  const { streamingResponse, responses, responseRef } = socketHook;
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("reader");
  
  // Filter out initialization messages using our utility
  const contentResponses = useMemo(() => {
    return filterContentResponses(responses);
  }, [responses]);
  
  // Check if we have any responses
  if (!contentResponses || contentResponses.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <Alert className="w-full max-w-2xl">
          <AlertDescription>
            {isScraperLoading(streamingResponse) ? "Processing web page..." : "No page content available."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full flex flex-col">
      {/* Page tabs - Only show if multiple pages */}
      <PageTabs 
        responses={contentResponses} 
        activePageIndex={activePageIndex} 
        setActivePageIndex={setActivePageIndex} 
      />
      
      {/* Main content area */}
      <div className="flex-1 h-full overflow-hidden">
        {contentResponses.length > 0 && activePageIndex < contentResponses.length ? (
          <PageContent 
            pageData={contentResponses[activePageIndex]} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        ) : (
          <div className="p-4 text-gray-500 dark:text-gray-400">No content available</div>
        )}
      </div>
    </div>
  );
};

export default ScraperResultsComponent;