"use client";

import DirectMarkdownRenderer from "./DirectMarkdownRenderer";

interface MarkdownProcessorProps {
  markdown: string;
  configKey: string;
  viewType?: string;
  className?: string;
  isLoading?: boolean;
}

/**
 * A component that processes markdown with a specified configuration and renders it
 * using the appropriate view.
 * 
 * @param markdown - The markdown string to process
 * @param configKey - The configuration key to use from the config registry
 * @param viewType - Optional specific view type to use
 * @param className - Optional className for the container
 * @param isLoading - Optional loading state flag
 */
const MarkdownProcessor = ({
  markdown,
  configKey,
  viewType,
  className = "",
  isLoading = false,
}: MarkdownProcessorProps) => {
  // Directly pass props to the DirectMarkdownRenderer
  return (
    <DirectMarkdownRenderer
      markdown={markdown}
      configKey={configKey}
      viewType={viewType}
      className={className}
      isLoading={isLoading}
    />
  );
};

export default MarkdownProcessor; 