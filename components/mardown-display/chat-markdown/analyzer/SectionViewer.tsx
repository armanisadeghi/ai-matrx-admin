import React, { useState } from 'react';
import { Copy, Check, FileText, Code, Table, List, Hash, Type, BookOpen, CheckSquare, Braces } from 'lucide-react';

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
}



const getSectionIcon = (sectionType: SectionType) => {
  const iconProps = { size: 14, className: "text-gray-500 dark:text-gray-400" };
  
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
      <pre className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 overflow-x-auto text-sm font-mono">
        <code className="text-gray-800 dark:text-gray-200">
          {content.join('\n')}
        </code>
      </pre>
    );
  }
  
  if (sectionType === "numbered_list_without_header" || sectionType === "header_with_numbered_list") {
    return (
      <ol className="list-decimal list-inside space-y-1">
        {content.map((item, index) => (
          <li key={index} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {item}
          </li>
        ))}
      </ol>
    );
  }
  
  if (sectionType === "header_with_bullets" || sectionType === "header_with_list" || sectionType === "bold_text_with_sub_bullets") {
    return (
      <ul className="list-disc list-inside space-y-1">
        {content.map((item, index) => (
          <li key={index} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  
  if (sectionType === "checklist") {
    return (
      <div className="space-y-2">
        {content.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <CheckSquare size={16} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {item}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {content.map((item, index) => (
        <p key={index} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {item}
        </p>
      ))}
    </div>
  );
};

const SectionViewer = ({ data }: { data: ClassifiedSection[] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (content: string[], index: number) => {
    try {
      await navigator.clipboard.writeText(content.join('\n'));
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="w-full h-full p-4 bg-inherit">
      <div className="max-w-4xl mx-auto h-full">
        <div className="h-full overflow-y-auto">
          <div className="space-y-4">
            {data.map((section, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getSectionIcon(section.section)}
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {getSectionLabel(section.section)}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(section.content, index)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === index ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                    )}
                  </button>
                </div>
                
                <div className="pl-1">
                  {renderContent(section)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionViewer;