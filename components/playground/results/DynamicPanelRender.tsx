'use client';

import React from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectTaskFirstListenerId, selectResponseTextByListenerId } from '@/lib/redux/socket-io/selectors';
import { BasePanelProps } from './types';

// Import existing parsers
import { enhancedMarkdownParser } from '@/components/mardown-display/markdown-classification/processors/custom/enhanced-parser';
import { separatedMarkdownParser } from '@/components/mardown-display/markdown-classification/processors/custom/parser-separated';
import { parseMarkdownSimple } from '@/components/mardown-display/markdown-classification/processors/custom/simple-markdown-parser';

// Parser registry type
type ParserFunction = (content: string) => any;

interface ParserRegistry {
    [key: string]: ParserFunction;
}

// Built-in parser registry
const PARSER_REGISTRY: ParserRegistry = {
    enhanced: enhancedMarkdownParser,
    separated: separatedMarkdownParser,
    markdownContent: parseMarkdownSimple,
    // Add more parsers here as needed
};

// Extended props interface
export interface DynamicPanelRenderProps extends BasePanelProps {
    component: React.ComponentType<any>;
    parser?: string; // name of parser to use from registry
    componentProps?: Record<string, any>; // additional props to pass to the component
    customParser?: ParserFunction; // allow passing a custom parser function
    errorFallback?: React.ComponentType<{ error: Error; content: string }>; // custom error component
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; content: string }> = ({ error, content }) => (
    <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950">
        <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Parsing Error</h3>
        <p className="text-red-600 dark:text-red-400 text-sm mb-3">{error.message}</p>
        <details className="mt-2">
            <summary className="text-red-700 dark:text-red-300 cursor-pointer text-sm">Show raw content</summary>
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-xs overflow-auto max-h-40">
                {content}
            </pre>
        </details>
    </div>
);

// Main component
export const DynamicPanelRender: React.FC<DynamicPanelRenderProps> = ({
    taskId,
    component: Component,
    parser,
    componentProps = {},
    customParser,
    errorFallback: ErrorFallback = DefaultErrorFallback,
    ...basePanelProps
}) => {
    // Get content from Redux store
    const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
    const streamingText = useAppSelector(selectResponseTextByListenerId(firstListenerId));

    // Process content based on parser selection
    const processedContent = React.useMemo(() => {
        if (!streamingText) return '';

        try {
            // If custom parser is provided, use it
            if (customParser) {
                return customParser(streamingText);
            }

            // If parser name is provided, use from registry
            if (parser && PARSER_REGISTRY[parser]) {
                return PARSER_REGISTRY[parser](streamingText);
            }

            // Default: return raw content
            return streamingText;
        } catch (error) {
            console.error(`Error processing content with parser "${parser}":`, error);
            throw error;
        }
    }, [streamingText, parser, customParser]);

    // Error boundary for parsing errors
    const [parsingError, setParsingError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        setParsingError(null);
        try {
            if (!streamingText) return;

            if (customParser) {
                customParser(streamingText);
            } else if (parser && PARSER_REGISTRY[parser]) {
                PARSER_REGISTRY[parser](streamingText);
            }
        } catch (error) {
            setParsingError(error as Error);
        }
    }, [streamingText, parser, customParser]);

    // If there's a parsing error, show error fallback
    if (parsingError) {
        return <ErrorFallback error={parsingError} content={streamingText} />;
    }

    // Render the component with processed content
    return (
        <div className="h-full w-full">
            <Component
                content={processedContent}
                {...componentProps}
                {...basePanelProps}
            />
        </div>
    );
};

// Utility function to register new parsers
export const registerParser = (name: string, parserFunction: ParserFunction) => {
    PARSER_REGISTRY[name] = parserFunction;
};

// Utility function to get available parsers
export const getAvailableParsers = (): string[] => {
    return Object.keys(PARSER_REGISTRY);
};

// Utility function to create a panel wrapper using DynamicPanelRender
export const createDynamicPanelWrapper = (
    component: React.ComponentType<any>,
    parser?: string,
    defaultProps?: Record<string, any>
) => {
    return function DynamicPanelWrapper(props: BasePanelProps) {
        return (
            <DynamicPanelRender
                {...props}
                component={component}
                parser={parser}
                componentProps={defaultProps}
            />
        );
    };
};

// Export the parser registry for external access
export { PARSER_REGISTRY };


