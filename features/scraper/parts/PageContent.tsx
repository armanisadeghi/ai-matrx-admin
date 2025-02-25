"use client";
import React from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractScraperData } from "../utils/scraper-utils";
import PageHeader from "./PageHeader";
import ContentTabs from "./ContentTabs";
import OrganizedContent from "./OrganizedContent";
import SimplifiedView from "./SimplifiedView";
import StructuredData from "./StructuredData";
import TextContent from "./TextContent";
import MetadataContent from "./MetadataContent";
import RemovalDetails from "./RemovalDetails";
import HashesContent from "./HashesContent";
import RawJSON from "./RawJSON";
import ActionButtons from "./ActionButtons";

/**
 * Component for displaying a single page's content
 */
const PageContent = ({ pageData, activeTab, setActiveTab }) => {
  if (!pageData) {
    return <div className="p-4 text-gray-500 dark:text-gray-400">No data available for this page</div>;
  }
  
  // Use our utility to extract all data safely
  const data = extractScraperData(pageData);
  
  if (data.isError) {
    return (
      <Alert className="m-4">
        <AlertDescription>{data.error}</AlertDescription>
      </Alert>
    );
  }
  
  const { 
    statusValue, 
    overview, 
    textData, 
    organizedData, 
    structuredData, 
    contentFilterDetails, 
    noiseRemoverDetails, 
    hashes 
  } = data;
  
  return (
    <div className="h-full flex flex-col">
      {/* Page info and status */}
      <PageHeader 
        title={overview?.page_title} 
        url={overview?.url} 
        status={statusValue} 
      />
      
      {/* Content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <ContentTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 overflow-auto">
          <TabsContent value="organized" className="m-0 h-full overflow-auto">
            <OrganizedContent organizedData={organizedData} />
          </TabsContent>
          
          <TabsContent value="reader" className="m-0 h-full overflow-auto">
            <SimplifiedView pageData={data} />
          </TabsContent>
          
          <TabsContent value="structured" className="m-0 h-full overflow-auto">
            <StructuredData structuredData={structuredData} />
          </TabsContent>
          
          <TabsContent value="text" className="m-0 h-full overflow-auto">
            <TextContent textData={textData} />
          </TabsContent>
          
          <TabsContent value="metadata" className="m-0 h-full overflow-auto">
            <MetadataContent overview={overview} />
          </TabsContent>
          
          <TabsContent value="content-filter" className="m-0 h-full overflow-auto">
            <RemovalDetails details={contentFilterDetails} title="Content Filter Removals" />
          </TabsContent>
          
          <TabsContent value="noise-remover" className="m-0 h-full overflow-auto">
            <RemovalDetails details={noiseRemoverDetails} title="Noise Remover Details" />
          </TabsContent>
          
          <TabsContent value="hashes" className="m-0 h-full overflow-auto">
            <HashesContent hashes={hashes} />
          </TabsContent>
          
          <TabsContent value="raw" className="m-0 h-full overflow-auto">
            <RawJSON pageData={pageData} />
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Action buttons */}
      <ActionButtons url={overview?.url} />
    </div>
  );
};

export default PageContent;