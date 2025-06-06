import React, { useState } from 'react';
import { Copy, Check, FileText, Hash, Type, List, Minus } from 'lucide-react';

export interface ContentItem {
  type: string;
  content: string;
  children?: ContentItem[];
}

export interface ContentSection {
  type: string;
  children: ContentItem[];
}

const getSectionIcon = (sectionType: string) => {
  const iconProps = { size: 16, className: "text-gray-500 dark:text-gray-400" };
  
  switch (sectionType) {
    case "json_block_section":
      return <FileText {...iconProps} />;
    case "table_block_section":
      return <FileText {...iconProps} />;
    case "xml_block_section":
      return <FileText {...iconProps} />;
    case "code_block_section":
      return <FileText {...iconProps} />;
    case "paragraph_section":
      return <Type {...iconProps} />;
    case "header_h1_section":
    case "header_h2_section":
    case "header_h3_section":
    case "header_h4_section":
    case "header_h5_section":
    case "header_h6_section":
      return <Hash {...iconProps} />;
    case "bold_text_section":
      return <Type {...iconProps} />;
    case "entry_and_value_section":
      return <List {...iconProps} />;
    case "checklist":
      return <List {...iconProps} />;
    case "numbered_list":
      return <Hash {...iconProps} />;
    case "reference":
      return <FileText {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};

const getSectionLabel = (sectionType: string) => {
  return sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const renderContentItem = (item: ContentItem, index: number) => {
  const { type, content } = item;
  
  if (type === "line_break") {
    return <div key={index} className="h-2" />;
  }
  
  if (type === "thematic_break") {
    return <hr key={index} className="my-4 border-gray-300 dark:border-gray-600" />;
  }
  
  if (type === "header_h1") {
    return (
      <h1 key={index} className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        {content}
      </h1>
    );
  }
  
  if (type === "header_h2") {
    return (
      <h2 key={index} className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {content}
      </h2>
    );
  }
  
  if (type === "header_h3") {
    return (
      <h3 key={index} className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">
        {content}
      </h3>
    );
  }
  
  if (type === "bullet") {
    return (
      <div key={index} className="flex items-start gap-2 mb-1">
        <span className="text-gray-600 dark:text-gray-400 mt-1">•</span>
        <div 
          className="text-gray-700 dark:text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    );
  }
  
  if (type === "paragraph") {
    return (
      <div 
        key={index} 
        className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  
  return (
    <div key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
      {content}
    </div>
  );
};

const extractSummaryFromSection = (section: ContentSection): string => {
  // Find the first header or meaningful content for summary
  const header = section.children.find(child => 
    child.type.startsWith('header_') && child.content.trim()
  );
  
  if (header) {
    return header.content.trim();
  }
  
  // Fallback to first paragraph with content
  const paragraph = section.children.find(child => 
    child.type === 'paragraph' && child.content.trim()
  );
  
  if (paragraph) {
    const text = paragraph.content.replace(/<[^>]*>/g, '').trim();
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }
  
  return 'Content Section';
};

const SectionsViewer = ({ data }: { data: ContentSection[] }) => {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [copiedData, setCopiedData] = useState<boolean>(false);
  
  const selectedSection = data[selectedSectionIndex];
  
  const copyToClipboard = async () => {
    try {
      const textContent = selectedSection.children
        .filter(item => item.content && item.content.trim())
        .map(item => item.content.replace(/<[^>]*>/g, ''))
        .join('\n');
      
      await navigator.clipboard.writeText(textContent);
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full p-4 bg-inherit flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No content to display</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full p-4 bg-gray-50 dark:bg-gray-900">
      <div className="h-full flex gap-4 max-w-7xl mx-auto">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Content Sections</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.length} section{data.length !== 1 ? 's' : ''}</p>
          </div>
          
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
            {data.map((section, index) => {
              const summary = extractSummaryFromSection(section);
              const contentCount = section.children.filter(child => 
                child.content && child.content.trim() && child.type !== 'line_break'
              ).length;
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedSectionIndex(index)}
                  className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedSectionIndex === index 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500' 
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getSectionIcon(section.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1 break-words">
                        {getSectionLabel(section.type)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {summary}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {contentCount} content item{contentCount !== 1 ? 's' : ''}
                      </p>
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
                <FileText size={20} className="text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Section {selectedSectionIndex + 1}
                </h3>
              </div>
              <button
                onClick={copyToClipboard}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                title="Copy section content"
              >
                {copiedData ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                )}
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
            <div className="max-w-4xl">
              {selectedSection.children.map((item, index) => 
                renderContentItem(item, index)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default SectionsViewer;