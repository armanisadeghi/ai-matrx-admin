import React, { useMemo } from "react";
import { ParsedContent } from "./types";
import MarkdownTable from "./tables/MarkdownTable";
import { DisplayTheme, THEMES } from "./themes";
import { extractUrls, LinkDisplay } from "./LinkDisplay";

interface EnhancedMarkdownCardProps {
  parsed: ParsedContent;
  theme?: DisplayTheme;
  fontSize?: number;
  className?: string;
}

const generateUniqueKey = (base: string, index: number, parentIndex?: number) => {
  const timestamp = Date.now();
  return `${base}-${parentIndex || ''}-${index}-${timestamp}`;
};

const EnhancedMarkdownCard = ({ parsed, theme, fontSize, className = '' }: EnhancedMarkdownCardProps) => {

  const { intro, sections, outro } = parsed;
  const themeColors = THEMES[theme];

  // Function to render content with potential links
  const renderContent = (content: string, type: 'text' | 'title') => {
    const { urls, cleanText } = extractUrls(content);
    if (urls.length === 0) return content;

    return (
      <LinkDisplay 
        url={urls[0]} 
        className="w-full"
      >
        <div className={type === 'title' ? 'font-bold' : ''}>
          {cleanText || 'Link'}
        </div>
      </LinkDisplay>
    );
  };

  // Function to render a section's content (without tables)
  const renderSectionContent = useMemo(() => (section: any, sectionIndex: number, isFullWidth = false) => {
    return (
      <div
        key={generateUniqueKey('section', sectionIndex)}
        className={`bg-gradient-to-br ${themeColors.container.background} border-2 ${themeColors.container.border} shadow-lg rounded-xl p-3 ${
          isFullWidth ? 'w-full' : ''
        }`}
      >
        <h2 className={`text-2xl font-bold bg-gradient-to-r ${themeColors.title.text} bg-clip-text text-transparent`}>
          {renderContent(section.title, 'title')}
        </h2>

        {section.intro && (
          <div className="mt-2 text-gray-700 dark:text-gray-300">
            {renderContent(section.intro, 'text')}
          </div>
        )}

        {section.items.length > 0 && (
          <ul className="mt-4 space-y-3">
            {section.items.map((item, itemIndex) => {
              const { urls, cleanText } = extractUrls(item.name);
              const itemHasLink = urls.length > 0;

              return (
                <li key={generateUniqueKey('item', itemIndex, sectionIndex)}>
                  {itemHasLink ? (
                    <LinkDisplay 
                      url={urls[0]}
                      className={`p-3 rounded-lg bg-white dark:bg-black/20 shadow-sm border ${themeColors.item.border} hover:scale-[1.02] transition-transform duration-200`}
                    >
                      <h3 className={`text-lg font-semibold ${themeColors.item.title}`}>
                        {cleanText || 'Link'}
                      </h3>
                    </LinkDisplay>
                  ) : (
                    <div className={`p-3 rounded-lg bg-white dark:bg-black/20 shadow-sm border ${themeColors.item.border} hover:scale-[1.02] transition-transform duration-200`}>
                      <h3 className={`text-lg font-semibold ${themeColors.item.title}`}>
                        {item.name}
                      </h3>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {section.outro && (
          <div className="mt-4 text-gray-700 dark:text-gray-300">
            {renderContent(section.outro, 'text')}
          </div>
        )}
      </div>
    );
  }, [themeColors]);

  // Function to render a table
  const renderTable = (table: any, sectionIndex: number, tableIndex: number, fontSize?: number, className?: string) => (
    <div 
      key={generateUniqueKey('table', tableIndex, sectionIndex)}
      className="w-full mt-6"
    >
      <div className={`bg-white dark:bg-black/20 p-4 rounded-lg shadow-sm border ${themeColors.item.border}`}>
        <h3 className={`text-lg font-semibold ${themeColors.item.title} mb-4`}>
          {renderContent(table.title, 'title')}
        </h3>
        <MarkdownTable data={table.data} fontSize={fontSize} theme={theme} className={className} />
      </div>
    </div>
  );

  // Process sections to handle grid breaks for tables
  const processedSections = useMemo(() => {
    const result = [];
    let currentGridSections = [];

    const flushGridSections = () => {
      if (currentGridSections.length > 0) {
        result.push({
          type: 'grid',
          sections: [...currentGridSections]
        });
        currentGridSections = [];
      }
    };

    sections?.forEach((section, index) => {
      if (section?.tables?.length > 0) {
        // Flush any pending grid sections
        flushGridSections();
        
        // Add the section content (if it has any items)
        if (section?.items?.length > 0) {
          result.push({
            type: 'fullWidth',
            section
          });
        }
        
        // Add each table
        section?.tables?.forEach((table, tableIndex) => {
          result.push({
            type: 'table',
            table,
            sectionIndex: index,
            tableIndex
          });
        });
      } else {
        // Regular section goes into the grid
        currentGridSections.push(section);
      }
    });

    // Flush any remaining grid sections
    flushGridSections();

    return result;
  }, [sections]);

  return (
    <div className="w-full p-1 space-y-4">
      {/* Intro - Always full width */}
      {intro && (
        <div className={`p-2 ${themeColors.item.background} border ${themeColors.item.border} rounded-md shadow-sm`}>
          <div className="text-gray-700 dark:text-gray-300">
            {renderContent(intro, 'text')}
          </div>
        </div>
      )}

      {/* Process all sections with proper grid breaks */}
      {processedSections.map((item, index) => {
        if (item.type === 'grid') {
          return (
            <div key={`grid-${index}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {item?.sections?.map((section, sectionIndex) => 
                renderSectionContent(section, sectionIndex)
              )}
            </div>
          );
        } else if (item.type === 'table') {
          return renderTable(item.table, item.sectionIndex, item.tableIndex, fontSize);
        } else {
          return renderSectionContent(item.section, item.sectionIndex, true);
        }
      })}

      {/* Outro - Always full width */}
      {outro && (
        <div className={`p-2 ${themeColors.item.background} border ${themeColors.item.border} rounded-md shadow-sm`}>
          <div className="text-gray-700 dark:text-gray-300">
            {renderContent(outro, 'text')}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMarkdownCard;