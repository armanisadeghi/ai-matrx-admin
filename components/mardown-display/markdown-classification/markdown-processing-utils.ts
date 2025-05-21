"use client";

// We'll dynamically import these only on the client side
// import { unified } from "unified";
// import remarkParse from "remark-parse";
// import remarkGfm from "remark-gfm";

import { CoordinatorDefinition, getCoordinatorConfig, getProcessor, getProcessorConfig } from "./markdown-coordinator";

import { AstNode } from "./processors/types";
import { ViewId } from "./custom-views/view-registry";
import { MarkdownConfig } from "./processors/json-config-system/config-processor";

// Helper to check if code is running on client side
const isClient = typeof window !== 'undefined';

export const parseMarkdownToAst = async (markdownText: string): Promise<AstNode> => {
    // Only run parser on the client side
    if (!isClient) {
        return { type: 'root', children: [] } as unknown as AstNode;
    }
    
    try {
        // Dynamically import the modules only on client side
        const [unified, remarkParse, remarkGfm] = await Promise.all([
            import('unified').then(m => m.unified),
            import('remark-parse').then(m => m.default),
            import('remark-gfm').then(m => m.default)
        ]);
        
        const processor = unified().use(remarkParse).use(remarkGfm);
        return processor.parse(markdownText) as unknown as AstNode;
    } catch (error) {
        console.error("Error parsing markdown to AST:", error);
        return { type: 'root', children: [] } as unknown as AstNode;
    }
};

export const prepareMarkdownForRendering = async (
    markdown: string,
    coordinatorId: string,
    requestedView: ViewId,
): Promise<{
    ast: AstNode;
    processedData: any | null;
    coordinatorDefinition: CoordinatorDefinition;
    processorConfig: MarkdownConfig | null;
    viewComponentInfo: {
        defaultViewId: ViewId;
        availableViews: ViewId[];
    };
}> => {
    // Return empty data if running on server
    if (!isClient) {
        // Create a minimal valid CoordinatorDefinition for server rendering
        const emptyCoordinatorDefinition: CoordinatorDefinition = {
            id: 'empty',
            label: 'Empty',
            description: 'Empty coordinator for server rendering',
            rawProcessor: 'ast',
            processor: 'empty',
            config: null,
            defaultView: 'raw' as ViewId,
            availableViews: ['raw' as ViewId],
            sampleData: []
        };
        
        return {
            ast: { type: 'root', children: [] } as unknown as AstNode,
            processedData: { extracted: {}, miscellaneous: {} },
            coordinatorDefinition: emptyCoordinatorDefinition,
            processorConfig: null,
            viewComponentInfo: {
                defaultViewId: 'raw' as ViewId,
                availableViews: ['raw' as ViewId],
            },
        };
    }
    
    try {
        // 1. Get the AST, which all processors need.
        const ast = await parseMarkdownToAst(markdown);

        // 2. Get the coordinator definition.
        const coordinatorDefinition = getCoordinatorConfig(coordinatorId);
        if (!coordinatorDefinition) {
            throw new Error(`Coordinator not found: ${coordinatorId}`);
        }

        // 3. Get the processor function
        const processorEntry = getProcessor(coordinatorId);
        if (!processorEntry) {
            throw new Error(`Processor not found for coordinator: ${coordinatorId}`);
        }
        const processorLoader = processorEntry.processor;
        const processorFn = await processorLoader();

        // 4. If the definitions require configs, get the configs.
        let processorConfig = null as MarkdownConfig | null;
        if (coordinatorDefinition.config) {
            const configEntry = getProcessorConfig(coordinatorId);
            if (configEntry) {
                processorConfig = configEntry.config;
            }
        }

        // 5. Call the processor function with the AST and Configs
        let processedData = null;
        try {
            // Create properly typed processor input object
            const processorInput = {
                ast,
                config: processorConfig
            };
            
            processedData = processorFn(processorInput);
        } catch (err) {
            console.error("Error calling processor function:", err);
            throw err;
        }

        // 6. Get the default view and the other options.
        const viewComponentInfo = {
            defaultViewId: coordinatorDefinition.defaultView,
            availableViews: coordinatorDefinition.availableViews,
        };

        return {
            ast,
            processedData,
            coordinatorDefinition,
            processorConfig,
            viewComponentInfo,
        };
    } catch (error) {
        console.error("Error preparing markdown for rendering:", error);
        throw error;
    }
};
