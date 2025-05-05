import React, { useState } from "react";



interface CompactListDisplayProps {
  items: string[];
  label?: string;
  displayCount?: number;
  isCopyable?: boolean;
}

export const CompactListDisplay = ({
  items,
  label,
  displayCount = 1,
  isCopyable = true
}: CompactListDisplayProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // No items to display
  if (!items.length) {
    return (
      <div className="text-sm text-muted-foreground">
        {label ? `${label}: ` : ""}No items
      </div>
    );
  }

  // Determine what to display based on state
  const displayItems = isExpanded ? items : items.slice(0, displayCount);
  const hasMore = items.length > displayCount;
  
  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(items.join('\n')).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="relative">
      <div className="flex flex-col space-y-1">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 rounded p-2 max-w-full overflow-hidden">
          {displayItems.map((item, index) => (
            <div key={index} className="truncate">{item}</div>
          ))}
          
          {!isExpanded && hasMore && (
            <div 
              className="text-xs text-blue-500 cursor-pointer hover:underline"
              onClick={() => setIsExpanded(true)}
            >
              + {items.length - displayCount} more
            </div>
          )}
          
          {isExpanded && (
            <div 
              className="text-xs text-blue-500 cursor-pointer hover:underline mt-1"
              onClick={() => setIsExpanded(false)}
            >
              Show less
            </div>
          )}
        </div>
      </div>
      
      {isCopyable && (
        <button
          className="absolute top-0 right-0 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {isCopied ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};



export const Tooltip = ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => {
    return (
        <div className="group relative inline-block">
            {children}
            <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-sm rounded p-2 -mt-2 left-full ml-2 min-w-max">
                {content}
            </div>
        </div>
    );
};
