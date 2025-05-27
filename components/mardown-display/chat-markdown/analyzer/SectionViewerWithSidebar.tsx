import React, { useState } from 'react';
import { Copy, Check, FileText, Code, Table, List, Hash, Type, BookOpen, CheckSquare, Braces, Eye } from 'lucide-react';

export type SectionType =
    | "intro_text"
    | "code_block"
    | "table"
    | "entries_and_values"
    | "header_with_or_without_text"
    | "header_with_list"
    | "header_with_bullets"
    | "header_with_numbered_list"
    | "header_with_text"
    | "numbered_list_without_header"
    | "bold_text_with_sub_bullets"
    | "plain_text"
    | "outro_text"
    | "json_block"
    | "checklist"
    | "other_section_type"
    | string;

export interface ClassifiedSection {
    section: SectionType;
    content: string[];
    // Optional additional JSON representations
    format1?: any;
    format2?: any;
    format3?: any;
}

type ViewMode = 'content' | 'format1' | 'format2' | 'format3';

const getSectionIcon = (sectionType: SectionType) => {
  const iconProps = { size: 16, className: "text-gray-500 dark:text-gray-400" };
  
  switch (sectionType) {
    case "code_block":
      return <Code {...iconProps} />;
    case "table":
      return <Table {...iconProps} />;
    case "numbered_list_without_header":
    case "header_with_numbered_list":
      return <Hash {...iconProps} />;
    case "header_with_list":
    case "header_with_bullets":
    case "bold_text_with_sub_bullets":
      return <List {...iconProps} />;
    case "json_block":
      return <Braces {...iconProps} />;
    case "checklist":
      return <CheckSquare {...iconProps} />;
    case "intro_text":
    case "outro_text":
    case "header_with_text":
    case "plain_text":
      return <Type {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};

const getSectionLabel = (sectionType: SectionType) => {
  return sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const renderContent = (section: ClassifiedSection) => {
  const { content, section: sectionType } = section;
  
  if (sectionType === "code_block" || sectionType === "json_block") {
    return (
      <pre className="bg-gray-50 dark:bg-gray-800 rounded-md p-4 overflow-x-auto text-sm font-mono">
        <code className="text-gray-800 dark:text-gray-200">
          {content.join('\n')}
        </code>
      </pre>
    );
  }
  
  if (sectionType === "numbered_list_without_header" || sectionType === "header_with_numbered_list") {
    return (
      <ol className="list-decimal list-inside space-y-2">
        {content.map((item, index) => (
          <li key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {item}
          </li>
        ))}
      </ol>
    );
  }
  
  if (sectionType === "header_with_bullets" || sectionType === "header_with_list" || sectionType === "bold_text_with_sub_bullets") {
    return (
      <ul className="list-disc list-inside space-y-2">
        {content.map((item, index) => (
          <li key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  
  if (sectionType === "checklist") {
    return (
      <div className="space-y-3">
        {content.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <CheckSquare size={18} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {item}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {content.map((item, index) => (
        <p key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {item}
        </p>
      ))}
    </div>
  );
};

const renderJsonFormat = (data: any, label: string) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
        {label}
      </h3>
      <pre className="bg-gray-50 dark:bg-gray-800 rounded-md p-4 overflow-x-auto text-sm font-mono">
        <code className="text-gray-800 dark:text-gray-200">
          {JSON.stringify(data, null, 2)}
        </code>
      </pre>
    </div>
  );
};

const SectionViewerWithSidebar = ({ data }: { data: ClassifiedSection[] }) => {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('content');
  const [copiedData, setCopiedData] = useState<string | null>(null);

  const selectedSection = data[selectedSectionIndex];
  
  const availableFormats = [
    { key: 'content' as ViewMode, label: 'Content', available: true },
    { key: 'format1' as ViewMode, label: 'Format 1', available: selectedSection?.format1 !== undefined },
    { key: 'format2' as ViewMode, label: 'Format 2', available: selectedSection?.format2 !== undefined },
    { key: 'format3' as ViewMode, label: 'Format 3', available: selectedSection?.format3 !== undefined },
  ].filter(format => format.available);

  // Reset view mode if current mode is not available for selected section
  React.useEffect(() => {
    if (!availableFormats.find(f => f.key === viewMode)) {
      setViewMode('content');
    }
  }, [selectedSectionIndex, availableFormats]);

  const copyToClipboard = async (data: any, type: string) => {
    try {
      let textToCopy: string;
      if (type === 'content') {
        textToCopy = selectedSection.content.join('\n');
      } else {
        textToCopy = JSON.stringify(data, null, 2);
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopiedData(type);
      setTimeout(() => setCopiedData(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'content':
        return renderContent(selectedSection);
      case 'format1':
        return renderJsonFormat(selectedSection.format1, 'Format 1');
      case 'format2':
        return renderJsonFormat(selectedSection.format2, 'Format 2');
      case 'format3':
        return renderJsonFormat(selectedSection.format3, 'Format 3');
      default:
        return renderContent(selectedSection);
    }
  };

  const getCurrentData = () => {
    switch (viewMode) {
      case 'content':
        return selectedSection.content;
      case 'format1':
        return selectedSection.format1;
      case 'format2':
        return selectedSection.format2;
      case 'format3':
        return selectedSection.format3;
      default:
        return selectedSection.content;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full p-4 bg-inherit flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No sections to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 bg-inherit">
      <div className="h-full flex gap-4">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Sections</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.length} total</p>
          </div>
          
          <div className="overflow-y-auto h-full">
            {data.map((section, index) => (
              <button
                key={index}
                onClick={() => setSelectedSectionIndex(index)}
                className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedSectionIndex === index 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500' 
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {getSectionIcon(section.section)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {getSectionLabel(section.section)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {section.content.length} item{section.content.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Header with view mode tabs */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getSectionIcon(selectedSection.section)}
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {getSectionLabel(selectedSection.section)}
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(getCurrentData(), viewMode)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                title="Copy to clipboard"
              >
                {copiedData === viewMode ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                )}
              </button>
            </div>
            
            {/* View mode tabs */}
            <div className="flex gap-1">
              {availableFormats.map((format) => (
                <button
                  key={format.key}
                  onClick={() => setViewMode(format.key)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === format.key
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto h-full">
            {renderCurrentView()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionViewerWithSidebar;