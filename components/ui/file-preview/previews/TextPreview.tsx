// TextPreview.tsx
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import React, { useState, useEffect } from "react";

interface TextPreviewProps {
  file: {
    url: string;
    type: string;
    details?: EnhancedFileDetails;
  };
}

const TextPreview: React.FC<TextPreviewProps> = ({ file }) => {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch text content: ${response.status}`);
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load text content");
        console.error("Error fetching text:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [file.url]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-red-500 mb-2">Error loading text content</div>
        <div className="text-sm text-gray-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-4">
      <pre className="whitespace-pre-wrap font-mono text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded-md min-h-full">
        {content}
      </pre>
    </div>
  );
};

export default TextPreview;
