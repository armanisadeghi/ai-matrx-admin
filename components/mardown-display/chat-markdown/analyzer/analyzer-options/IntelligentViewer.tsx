import React, { useState } from 'react';
import { AlertTriangle, Lightbulb, Eye, FileJson } from 'lucide-react';
import { 
  JsonFallback, 
  getSectionTypeIcon, 
  getSectionTypeLabel, 
  useCopyToClipboard,
  extractSummaryFromContent,
  isValidString,
  isValidStringArray
} from './viewer-utilities';
import { BasicMarkdownContent } from '../../BasicMarkdownContent';
import { getViewerRecommendation, analyzeDataStructure, type ViewerRecommendation } from './viewer-recommendation-utility';
import RawJsonExplorer from '@/components/official/json-explorer/RawJsonExplorer';

// Fallback icon for unknown types
const UnknownIcon = () => (
  <AlertTriangle size={16} className="text-red-500" />
);

// Data structure interfaces
interface ChildItem {
  type: string;
  content: string;
}

interface SectionWithChildren {
  type: string;
  children: ChildItem[];
}

interface ProcessedSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  rawData?: any;
  isUnknown?: boolean;
}

// Structure detection functions
const isKeyValueObject = (data: any): boolean => {
  return (
    data && 
    typeof data === 'object' && 
    !Array.isArray(data) &&
    Object.keys(data).length > 0 &&
    Object.values(data).every(value => typeof value === 'string')
  );
};

const isSectionWithChildrenArray = (data: any): boolean => {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every(item => 
      item && 
      typeof item === 'object' && 
      typeof item.type === 'string' &&
      Array.isArray(item.children) &&
      item.children.every((child: any) => 
        child && 
        typeof child === 'object' &&
        typeof child.type === 'string' &&
        typeof child.content === 'string'
      )
    )
  );
};

// Line break preprocessing function
const preprocessContentForLineBreaks = (content: string): string => {
  // Convert explicit \n characters from Python to proper markdown line breaks
  // Replace single \n with \n\n for proper paragraph breaks in markdown
  return content.replace(/\n/g, '\n\n');
};

// Content processing functions
const convertChildrenToMarkdown = (children: ChildItem[]): string => {
  return children.map(child => {
    switch (child.type) {
      case 'header_h1':
        return `# ${child.content}`;
      case 'header_h2':
        return `## ${child.content}`;
      case 'header_h3':
        return `### ${child.content}`;
      case 'header_h4':
        return `#### ${child.content}`;
      case 'header_h5':
        return `##### ${child.content}`;
      case 'header_h6':
        return `###### ${child.content}`;
      case 'bullet':
        return `- ${child.content}`;
      case 'numbered_list_item':
        return `1. ${child.content}`;
      case 'paragraph':
        return child.content;
      case 'line_break':
        return '\n';
      case 'thematic_break':
        return '\n---\n';
      case 'bold_text':
        return `**${child.content}**`;
      case 'italic_text':
        return `*${child.content}*`;
      case 'quote':
        return `> ${child.content}`;
      case 'code':
      case 'code_block':
        return `\`\`\`\n${child.content}\n\`\`\``;
      case 'link':
        return `[${child.content}](${child.content})`;
      default:
        return child.content;
    }
  }).join('\n');
};

const processKeyValueData = (data: Record<string, string>): ProcessedSection[] => {
  return Object.entries(data).map(([key, value], index) => {
    const title = getSectionTypeLabel(key);
    const icon = getSectionTypeIcon(key);
    const isKnownType = icon.props.className !== "text-gray-500 dark:text-gray-400"; // Check if we got a generic icon
    
    return {
      id: `section-${index}`,
      title,
      icon: isKnownType ? icon : <UnknownIcon />,
      content: preprocessContentForLineBreaks(value), // Apply line break preprocessing
      isUnknown: !isKnownType
    };
  });
};

const processSectionWithChildrenData = (data: SectionWithChildren[]): ProcessedSection[] => {
  return data.map((section, index) => {
    const title = getSectionTypeLabel(section.type);
    const icon = getSectionTypeIcon(section.type);
    const isKnownType = icon.props.className !== "text-gray-500 dark:text-gray-400";
    
    const markdownContent = convertChildrenToMarkdown(section.children);
    
    return {
      id: `section-${index}`,
      title,
      icon: isKnownType ? icon : <UnknownIcon />,
      content: markdownContent,
      rawData: section,
      isUnknown: !isKnownType
    };
  });
};

// Fallback processor for unknown structures
const processUnknownData = (data: any): ProcessedSection[] => {
  // Try to find content-like structures
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (item && typeof item === 'object') {
        // Look for content key
        const contentKey = Object.keys(item).find(key => 
          key.toLowerCase().includes('content') || 
          key.toLowerCase().includes('text') ||
          key.toLowerCase().includes('description')
        );
        
        if (contentKey && typeof item[contentKey] === 'string') {
          const typeKey = Object.keys(item).find(key => 
            key.toLowerCase().includes('type') || 
            key.toLowerCase().includes('kind') ||
            key.toLowerCase().includes('category')
          );
          
          const title = typeKey ? getSectionTypeLabel(item[typeKey]) : `Item ${index + 1}`;
          
          return {
            id: `unknown-${index}`,
            title,
            icon: <UnknownIcon />,
            content: item[contentKey],
            rawData: item,
            isUnknown: true
          };
        }
      }
      
      // Fallback to JSON display
      return {
        id: `unknown-${index}`,
        title: `Unknown Item ${index + 1}`,
        icon: <UnknownIcon />,
        content: '',
        rawData: item,
        isUnknown: true
      };
    });
  }
  
  // Single unknown object
  return [{
    id: 'unknown-0',
    title: 'Unknown Data Structure',
    icon: <UnknownIcon />,
    content: '',
    rawData: data,
    isUnknown: true
  }];
};

const IntelligentViewer = ({ data }: { data: any }) => {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [showRecommendation, setShowRecommendation] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<ViewerRecommendation | null>(null);
  const [showJsonExplorer, setShowJsonExplorer] = useState<boolean>(false);
  const { copy, copied } = useCopyToClipboard();
  
  // Function to analyze data and get recommendation
  const analyzeAndRecommend = () => {
    const rec = getViewerRecommendation(data);
    const analysis = analyzeDataStructure(data);
    setRecommendation({ ...rec, ...analysis });
    setShowRecommendation(true);
  };
  
  // Process data based on structure
  let processedSections: ProcessedSection[] = [];
  
  if (isKeyValueObject(data)) {
    processedSections = processKeyValueData(data);
  } else if (isSectionWithChildrenArray(data)) {
    processedSections = processSectionWithChildrenData(data);
  } else {
    processedSections = processUnknownData(data);
  }
  
  const selectedSection = processedSections[selectedSectionIndex] || processedSections[0];
  
  const handleCopy = async () => {
    if (!selectedSection) return;
    
    const textToCopy = selectedSection.content || JSON.stringify(selectedSection.rawData, null, 2);
    await copy(textToCopy);
  };
  
  if (!processedSections || processedSections.length === 0) {
    return (
      <JsonFallback 
        data={data} 
        title="Raw Data (JSON)"
        subtitle="No recognizable structure"
        className="w-full h-full p-4 bg-gray-50 dark:bg-gray-900"
      />
    );
  }
  
  return (
    <div className="w-full h-full p-4 bg-gray-50 dark:bg-gray-900">
      <div className="h-full flex gap-4 max-w-7xl mx-auto">
        {/* Dynamic Sidebar */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                  {showJsonExplorer ? 'JSON Explorer' : 'Content Sections'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {showJsonExplorer ? (
                    'Raw data structure view'
                  ) : (
                    <>
                      {processedSections.length} section{processedSections.length !== 1 ? 's' : ''}
                      {processedSections.some(s => s.isUnknown) && (
                        <span className="ml-2 text-red-500 text-xs">
                          ({processedSections.filter(s => s.isUnknown).length} unknown)
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowJsonExplorer(!showJsonExplorer)}
                  className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                  title={showJsonExplorer ? "Show content sections" : "View raw JSON data"}
                >
                  <FileJson size={16} className={`${
                    showJsonExplorer 
                      ? 'text-blue-500' 
                      : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`} />
                </button>
                <button
                  onClick={analyzeAndRecommend}
                  className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                  title="Analyze data structure and get viewer recommendations"
                >
                  <Lightbulb size={16} className="text-yellow-500 group-hover:text-yellow-600" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
            {processedSections.map((section, index) => {
              const summary = section.content ? 
                extractSummaryFromContent(section.content, 50) || 'Content Section' :
                'Raw Data';
              
              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSectionIndex(index)}
                  className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedSectionIndex === index 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500' 
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {section.icon}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium mb-1 break-words ${
                        section.isUnknown 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {section.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {summary}
                      </p>
                      {section.isUnknown && (
                        <p className="text-xs text-red-500 mt-1">
                          Unknown structure
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedSection?.icon}
                <h3 className={`font-semibold ${
                  selectedSection?.isUnknown 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {selectedSection?.title || 'Unknown Section'}
                </h3>
                {selectedSection?.isUnknown && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-md">
                    Needs Handler
                  </span>
                )}
              </div>
              <button
                onClick={handleCopy}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                title="Copy section content"
              >
                {copied ? (
                  <AlertTriangle size={16} className="text-green-500" />
                ) : (
                  <AlertTriangle size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                )}
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
            <div className="max-w-4xl">
              {/* Viewer Recommendation Display */}
              {showRecommendation && recommendation && !showJsonExplorer && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Eye size={20} className="text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                          Recommended Viewer: {recommendation.viewerName}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          recommendation.confidence === 'high' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : recommendation.confidence === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                          {recommendation.confidence} confidence
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                        {recommendation.reasoning}
                      </p>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        <span className="font-medium">Pattern:</span> {recommendation.matchedPattern}
                        {recommendation.sampleCount && (
                          <span className="ml-3"><span className="font-medium">Count:</span> {recommendation.sampleCount}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowRecommendation(false)}
                        className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                      >
                        Hide recommendation
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showJsonExplorer ? (
                <RawJsonExplorer pageData={data} />
              ) : (
                selectedSection ? (
                  selectedSection.content ? (
                    <BasicMarkdownContent 
                      content={selectedSection.content}
                      showCopyButton={false}
                    />
                  ) : (
                    // Fallback to JSON display for unknown structures
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        This structure is not recognized. Displaying raw data:
                      </div>
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        {JSON.stringify(selectedSection.rawData || selectedSection, null, 2)}
                      </pre>
                    </div>
                  )
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No content available</p>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligentViewer; 