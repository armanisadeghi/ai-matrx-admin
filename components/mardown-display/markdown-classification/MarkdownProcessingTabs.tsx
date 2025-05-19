"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent, Button, InlineCopyButton } from "@/components/ui";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import ProcessorExtractor from "@/components/official/processor-extractor/ProcessorExtractor";
import ConfigViewRenderer from "@/components/mardown-display/markdown-classification/custom-views/ConfigViewRenderer";

interface MdastNode {
    type: string;
    children?: MdastNode[];
    value?: string;
    depth?: number;
    url?: string;
    lang?: string;
    [key: string]: any;
}

interface MarkdownProcessingTabsProps {
    ast: MdastNode | null;
    parsedMarkdown: string;
    processedData: any;
    selectedConfig: string;
    mode: "light" | "dark";
    onParse: () => void;
}

const MarkdownProcessingTabs: React.FC<MarkdownProcessingTabsProps> = ({
    ast,
    parsedMarkdown,
    processedData,
    selectedConfig,
    mode,
    onParse,
}) => {
    return (
        <div className="w-2/3 flex flex-col">
            <Tabs defaultValue="processor-extractor" className="w-full h-full flex flex-col">
                <TabsList className="mx-2 my-1 gap-1 bg-transparent flex-shrink-0">
                    <TabsTrigger value="processor-extractor">Processor Extractor</TabsTrigger>
                    <TabsTrigger value="ast">Raw AST</TabsTrigger>
                    <TabsTrigger value="explorer">AST Explorer</TabsTrigger>
                    <TabsTrigger value="processedJson">Processed JSON</TabsTrigger>
                    <TabsTrigger value="structured">Structured View</TabsTrigger>
                </TabsList>


                {/* Tab 1: Processor Extractor */}
                <TabsContent value="processor-extractor" className="h-full overflow-auto flex-grow">
                    {processedData ? (
                        <div className="h-full">
                            <ProcessorExtractor jsonData={processedData} configKey={selectedConfig} />
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 m-2">Click "Parse Markdown" to see the processor extractor.</p>
                    )}
                </TabsContent>

                {/* Tab 2: Raw AST JSON */}
                <TabsContent value="ast" className="h-full w-full relative">
                    {ast ? (
                        <>
                            <pre className="bg-gray-800 dark:bg-gray-950 text-gray-100 rounded-md overflow-x-auto h-full m-0 p-2 ">
                                <code>{JSON.stringify(ast, null, 2)}</code>
                            </pre>
                            <InlineCopyButton content={ast} position="top-right" size="md" />
                        </>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 m-2">Click "Parse Markdown" to see the AST.</p>
                    )}
                </TabsContent>

                {/* Tab 3: JSON Explorer for AST */}
                <TabsContent value="explorer" className="h-full overflow-auto flex-grow">
                    {ast ? (
                        <div className="h-full">
                            <ProcessorExtractor jsonData={ast} configKey={selectedConfig} />
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 m-2">Click "Parse Markdown" to see the JSON Explorer.</p>
                    )}
                </TabsContent>

                {/* Tab 4: Processed JSON Explorer */}
                <TabsContent value="processedJson" className="h-full overflow-auto flex-grow">
                    {processedData ? (
                        <div className="h-full">
                            <RawJsonExplorer pageData={processedData} />
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 m-2">Click "Parse Markdown" to see the processed JSON data.</p>
                    )}
                </TabsContent>


                {/* Tab 5: Structured View */}
                <TabsContent value="structured" className="h-full overflow-hidden p-0 flex-grow">
                    {processedData ? (
                        <ConfigViewRenderer configKey={selectedConfig} data={processedData} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">Click "Parse Markdown" to see the structured view</p>
                            <Button onClick={onParse}>Parse Markdown</Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default MarkdownProcessingTabs;
