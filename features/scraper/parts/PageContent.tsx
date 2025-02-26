"use client";
import React, { useState, useEffect } from "react";
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
import RawJsonExplorer from "./RawJsonExplorer";
import ActionButtons from "./ActionButtons";
import FancyJsonExplorer from "./FancyJsonExplorer";
import BookmarkViewer from "./BookmarkViewer";
import { formatJson } from "@/utils/json-cleaner-utility";
import SEOAnalysisPage from "@/features/scraper/parts/SEOAnalysisPage";
import PersistentRecipeContent from "./recipes/AlwaysMounted";
import { useRunRecipeSocket } from "@/lib/redux/socket/hooks/task-socket-hooks/runRecipeSocket";
import { convertOrganizedDataToString } from "../utils/scraper-utils";
import HeaderAnalysis from "./HeaderAnalysis";

interface PageContentProps {
  pageData: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const recipeIdFactChecker = "07e85962-71c8-4a2d-acb0-80d1771a4594";
const brokerId = "59dd12d8-8bec-40ae-af24-09d2cf28a806";
const recipeIdSEO = "0288e091-6252-4cca-b140-7ba94b4eb206";

const PageContent: React.FC<PageContentProps> = ({ pageData, activeTab, setActiveTab }) => {
    if (!pageData) {
        return <div className="p-4 text-gray-500 dark:text-gray-400">No data available for this page</div>;
    }

    const data = extractScraperData(pageData);
    const jsonStr = formatJson(pageData);

    if (data.isError) {
        return (
            <Alert className="m-4">
                <AlertDescription>{data.error}</AlertDescription>
            </Alert>
        );
    }

    const { statusValue, overview, textData, organizedData, structuredData, allRemovals, hashes, contentOutline } = data;
    const [readyToSubmit, setReadyToSubmit] = useState<boolean>(false);
    const [brokersSet, setBrokersSet] = useState<boolean>(false);

    const value = convertOrganizedDataToString(organizedData);
    const runRecipeHook = useRunRecipeSocket({ recipeId: recipeIdFactChecker });
    const { handleSubmit, socketHook, addBrokerValue, addBrokerValueBatch, setModelOverride } = runRecipeHook;

    useEffect(() => {
        setModelOverride("gpt-4o-mini");
    }, []);

    useEffect(() => {
        if (!value || brokersSet || organizedData.length === 0) return;
        addBrokerValue(brokerId, value);
        setBrokersSet(true);
        setReadyToSubmit(true);
    }, [value, brokersSet, organizedData, addBrokerValue, brokerId]);

    useEffect(() => {
        if (!readyToSubmit || !brokersSet) return;
        handleSubmit();
    }, [readyToSubmit, handleSubmit, brokersSet]);

    return (
        <div className="h-full flex flex-col">
            <PageHeader title={overview?.page_title} url={overview?.url} status={statusValue} />
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
                    <TabsContent value="removals" className="m-0 h-full overflow-auto">
                        <RemovalDetails allRemovals={allRemovals} />
                    </TabsContent>
                    <TabsContent value="header-analysis" className="m-0 h-full overflow-auto">
                        <HeaderAnalysis overview={overview} />
                    </TabsContent>
                    <TabsContent value="seo-analysis" className="m-0 h-full overflow-auto">
                        <SEOAnalysisPage overview={overview} structuredData={structuredData} />
                    </TabsContent>
                    <TabsContent value="recipe-content" className="m-0 h-full overflow-auto">
                        <PersistentRecipeContent
                            socketHook={socketHook}
                            isVisible={activeTab === "recipe-content"}
                        />
                    </TabsContent>
                    <TabsContent value="hashes" className="m-0 h-full overflow-auto">
                        <HashesContent hashes={hashes} />
                    </TabsContent>
                    <TabsContent value="raw" className="m-0 h-full overflow-auto">
                        <RawJSON pageData={pageData} />
                    </TabsContent>
                    <TabsContent value="raw-explorer" className="m-0 h-full overflow-auto">
                        <RawJsonExplorer pageData={pageData} />
                    </TabsContent>
                    <TabsContent value="fancy-json-explorer" className="m-0 h-full overflow-auto">
                        <FancyJsonExplorer pageData={pageData} />
                    </TabsContent>
                    <TabsContent value="bookmark-viewer" className="m-0 h-full overflow-auto">
                        <BookmarkViewer pageData={pageData} />
                    </TabsContent>
                </div>
            </Tabs>
            <ActionButtons url={overview?.url} />
        </div>
    );
};

export default PageContent;