import React, { useState } from 'react';
import { 
  Copy, Check, FileText, Code, Table, List, Hash, Type, BookOpen, 
  CheckSquare, Braces, Minus, Archive, Link, Quote, Image,
  Info, AlertCircle, HelpCircle, Star
} from 'lucide-react';

// ==========================================
// SECTION TYPE DEFINITIONS
// ==========================================

export type CommonSectionType =
  // Content Types
  | "intro_text"
  | "outro_text"
  | "plain_text"
  | "paragraph_section"
  
  // Code and Technical
  | "code_block"
  | "code_block_section"
  | "json_block"
  | "json_block_section"
  | "xml_block_section"
  
  // Tables and Data
  | "table"
  | "table_block_section"
  | "entries_and_values"
  | "entry_and_value_section"
  
  // Headers
  | "header_with_or_without_text"
  | "header_with_text"
  | "header_h1_section"
  | "header_h2_section"
  | "header_h3_section"
  | "header_h4_section"
  | "header_h5_section"
  | "header_h6_section"
  
  // Lists
  | "header_with_list"
  | "header_with_bullets"
  | "header_with_numbered_list"
  | "numbered_list_without_header"
  | "numbered_list"
  | "bold_text_with_sub_bullets"
  | "checklist"
  
  // Formatting
  | "bold_text_section"
  | "line_break"
  | "thematic_break"
  
  // References and Links
  | "reference"
  | "link_section"
  | "citation"
  
  // Media
  | "image_section"
  | "video_section"
  | "audio_section"
  
  // Special
  | "other_section_type"
  | "unknown_section"
  | "metadata_section"
  | "summary_section"
  | "conclusion_section"
  | string;

// ==========================================
// VALIDATION UTILITIES
// ==========================================

export interface BaseContentItem {
  type: string;
  content: string;
  [key: string]: any;
}

export interface BaseSection {
  section?: string;
  type?: string;
  content?: string[];
  children?: BaseContentItem[];
  [key: string]: any;
}

export const isValidString = (value: any): value is string => {
  return typeof value === 'string';
};

export const isValidStringArray = (value: any): value is string[] => {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
};

export const isValidContentItem = (item: any): item is BaseContentItem => {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.type === 'string' &&
    typeof item.content === 'string'
  );
};

export const isValidContentItemArray = (items: any): items is BaseContentItem[] => {
  return Array.isArray(items) && items.every(item => isValidContentItem(item));
};

export const isValidBaseSection = (section: any): section is BaseSection => {
  if (!section || typeof section !== 'object') return false;
  
  const hasStringContent = section.content && isValidStringArray(section.content);
  const hasChildrenContent = section.children && isValidContentItemArray(section.children);
  const hasSectionType = typeof section.section === 'string' || typeof section.type === 'string';
  
  return hasSectionType && (hasStringContent || hasChildrenContent);
};

export const isValidBaseSectionArray = (data: any): data is BaseSection[] => {
  return Array.isArray(data) && data.every(section => isValidBaseSection(section));
};

// ==========================================
// SECTION TYPE UTILITIES
// ==========================================

export const getSectionTypeLabel = (sectionType: string): string => {
  const labelMap: { [key: string]: string } = {
    "intro_text": "Introduction Text",
    "outro_text": "Outro Text",
    "plain_text": "Plain Text",
    "paragraph_section": "Paragraph",
    "code_block": "Code Block",
    "code_block_section": "Code Block",
    "json_block": "JSON Block",
    "json_block_section": "JSON Block",
    "xml_block_section": "XML Block",
    "table": "Table",
    "table_block_section": "Table Block",
    "entries_and_values": "Entries and Values",
    "entry_and_value_section": "Entry and Value",
    "header_with_or_without_text": "Header with Optional Text",
    "header_with_text": "Header with Text",
    "header_with_list": "Header with List",
    "header_with_bullets": "Header with Bullets",
    "header_with_numbered_list": "Header with Numbered List",
    "header_h1_section": "Header H1",
    "header_h2_section": "Header H2",
    "header_h3_section": "Header H3",
    "header_h4_section": "Header H4",
    "header_h5_section": "Header H5",
    "header_h6_section": "Header H6",
    "numbered_list_without_header": "Numbered List",
    "numbered_list": "Numbered List",
    "bold_text_with_sub_bullets": "Bold Text with Sub-bullets",
    "checklist": "Checklist",
    "bold_text_section": "Bold Text",
    "line_break": "Line Break",
    "thematic_break": "Thematic Break",
    "reference": "Reference",
    "link_section": "Link",
    "citation": "Citation",
    "image_section": "Image",
    "video_section": "Video",
    "audio_section": "Audio",
    "other_section_type": "Other Section",
    "unknown_section": "Unknown Section",
    "metadata_section": "Metadata",
    "summary_section": "Summary",
    "conclusion_section": "Conclusion"
  };
  
  return labelMap[sectionType] || sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getSectionTypeIcon = (sectionType: string, size: number = 16) => {
  const iconProps = { size, className: "text-gray-500 dark:text-gray-400" };
  
  switch (sectionType) {
    case "intro_text":
    case "outro_text":
      return <BookOpen {...iconProps} />;
    case "code_block":
    case "code_block_section":
    case "xml_block_section":
      return <Code {...iconProps} />;
    case "json_block":
    case "json_block_section":
      return <Braces {...iconProps} />;
    case "table":
    case "table_block_section":
      return <Table {...iconProps} />;
    case "entries_and_values":
    case "entry_and_value_section":
      return <List {...iconProps} />;
    case "header_with_or_without_text":
    case "header_with_text":
    case "header_with_list":
    case "header_with_bullets":
    case "header_with_numbered_list":
    case "header_h1_section":
    case "header_h2_section":
    case "header_h3_section":
    case "header_h4_section":
    case "header_h5_section":
    case "header_h6_section":
    case "numbered_list_without_header":
    case "numbered_list":
      return <Hash {...iconProps} />;
    case "bold_text_with_sub_bullets":
    case "bold_text_section":
    case "plain_text":
    case "paragraph_section":
      return <Type {...iconProps} />;
    case "checklist":
      return <CheckSquare {...iconProps} />;
    case "line_break":
    case "thematic_break":
      return <Minus {...iconProps} />;
    case "reference":
    case "link_section":
      return <Link {...iconProps} />;
    case "citation":
      return <Quote {...iconProps} />;
    case "image_section":
      return <Image {...iconProps} />;
    case "video_section":
    case "audio_section":
      return <Archive {...iconProps} />;
    case "unknown_section":
      return <HelpCircle {...iconProps} />;
    case "metadata_section":
      return <Info {...iconProps} />;
    case "summary_section":
    case "conclusion_section":
      return <Star {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};

// ==========================================
// COPY UTILITIES
// ==========================================

export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (!text || !text.trim()) {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

export const extractTextFromHTML = (htmlString: string): string => {
  return htmlString.replace(/<[^>]*>/g, '').trim();
};

export const stringArrayToText = (strings: string[]): string => {
  return strings.filter(str => str && str.trim()).join('\n');
};

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

interface JsonFallbackProps {
  data: any;
  onCopy?: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const JsonFallback: React.FC<JsonFallbackProps> = ({ 
  data, 
  onCopy, 
  title = "Raw Data (JSON)",
  subtitle = "Unexpected Format",
  className = ""
}) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const success = await copyTextToClipboard(jsonString);
      
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onCopy?.();
      }
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  return (
    <div className={`w-full h-full p-4 bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="h-full max-w-7xl mx-auto">
        <div className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {title}
                </h3>
                <span className="text-sm text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded-md">
                  {subtitle}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                title="Copy JSON data"
              >
                {copied ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                )}
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-auto" style={{ height: 'calc(100% - 80px)' }}>
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InvalidDataDisplayProps {
  data: any;
  title?: string;
  className?: string;
}

export const InvalidDataDisplay: React.FC<InvalidDataDisplayProps> = ({ 
  data, 
  title = "Invalid Data",
  className = ""
}) => {
  return (
    <div className={`bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={16} className="text-orange-500 dark:text-orange-400" />
        <span className="font-medium text-orange-600 dark:text-orange-400">
          {title}
        </span>
      </div>
      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

interface CopyButtonProps {
  onCopy: () => void;
  copied: boolean;
  size?: number;
  className?: string;
  title?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ 
  onCopy, 
  copied, 
  size = 16, 
  className = "",
  title = "Copy to clipboard"
}) => {
  return (
    <button
      onClick={onCopy}
      className={`p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group ${className}`}
      title={title}
    >
      {copied ? (
        <Check size={size} className="text-green-500" />
      ) : (
        <Copy size={size} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
      )}
    </button>
  );
};

// ==========================================
// CONTENT SUMMARY UTILITIES
// ==========================================

export const extractSummaryFromContent = (content: string[] | string, maxLength: number = 50): string => {
  if (!content) return 'No content';
  
  const text = Array.isArray(content) ? content.join(' ') : content;
  const cleanText = extractTextFromHTML(text).trim();
  
  if (!cleanText) return 'No content';
  
  return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + '...' : cleanText;
};

export const countValidItems = (items: any[]): number => {
  if (!Array.isArray(items)) return 0;
  return items.filter(item => item != null && 
    ((typeof item === 'string' && item.trim()) || 
     (typeof item === 'object' && item.content && typeof item.content === 'string' && item.content.trim()))
  ).length;
};

// ==========================================
// COMMON HOOKS
// ==========================================

export const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false);
  
  const copy = async (text: string): Promise<boolean> => {
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    return success;
  };
  
  return { copied, copy };
};

export const useSelectedIndex = (maxIndex: number) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  
  const selectIndex = (index: number) => {
    if (index >= 0 && index < maxIndex) {
      setSelectedIndex(index);
    }
  };
  
  return { selectedIndex, selectIndex };
}; 