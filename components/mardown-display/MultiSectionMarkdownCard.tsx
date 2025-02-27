import React, { useMemo } from "react";
import { ParsedContent } from "./types";
import MarkdownTable from "./tables/MarkdownTable";
import { DisplayTheme, THEMES } from "./themes";
import { extractUrls, LinkDisplay } from "./LinkDisplay";

/** -------------------------
 *  TYPES
 * ------------------------- */
export interface ListItem {
  name: string;
  children?: ListItem[];
}

export interface Section {
  title: string;
  intro: string;
  items: ListItem[];
  tables: { title: string; data: any }[];
  outro: string;
}

interface EnhancedMarkdownCardProps {
  parsed: ParsedContent;
  theme?: DisplayTheme;
  fontSize?: number;
  className?: string;
}

/** -------------------------
 *  UTILS
 * ------------------------- */
function generateUniqueKey(base: string, index: number, parentIndex?: number) {
  const timestamp = Date.now();
  return `${base}-${parentIndex || ""}-${index}-${timestamp}`;
}

function hasNestedItems(items: ListItem[]): boolean {
  return items.some(
    (item) =>
      (item.children && item.children.length > 0) ||
      (item.children && hasNestedItems(item.children))
  );
}

/**
 * Renders a single bullet "card" (the same card style you use for top-level list items).
 * We’ll reuse this inside the nested list so children have a similar appearance.
 */
function BulletCard({
  itemText,
  itemKey,
  themeColors,
}: {
  itemText: string;
  itemKey: string;
  themeColors: any;
}) {
  const { urls, cleanText } = extractUrls(itemText);
  const itemHasLink = urls.length > 0;

  return (
    <li key={itemKey}>
      {itemHasLink ? (
        <LinkDisplay
          url={urls[0]}
          className={`p-3 rounded-lg bg-white dark:bg-black/20 shadow-sm border ${themeColors.item.border} hover:scale-[1.02] transition-transform duration-200`}
        >
          <h3 className={`text-lg font-semibold ${themeColors.item.title}`}>
            {cleanText || "Link"}
          </h3>
        </LinkDisplay>
      ) : (
        <div
          className={`p-3 rounded-lg bg-white dark:bg-black/20 shadow-sm border ${themeColors.item.border} hover:scale-[1.02] transition-transform duration-200`}
        >
          <h3 className={`text-lg font-semibold ${themeColors.item.title}`}>
            {itemText}
          </h3>
        </div>
      )}
    </li>
  );
}

/**
 * Renders nested items recursively.
 * Each level gets a small left border + indentation to visually separate nesting.
 */
function NestedList({
  items,
  themeColors = THEMES.professional,
  parentIndex = 0,
}: {
  items: ListItem[];
  themeColors: any;
  parentIndex?: number;
}) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, idx) => {
        const key = generateUniqueKey("nested-item", idx, parentIndex);

        return (
          <React.Fragment key={key}>
            {/* Render the bullet card for this item */}
            <BulletCard itemText={item.name} itemKey={key} themeColors={themeColors} />

            {/* If the item has children, render them in an indented container */}
            {item.children && item.children.length > 0 && (
              <div className={`pl-2 ml-2 mt-2 ${themeColors.item.background}`}>
                <NestedList
                  items={item.children}
                  themeColors={themeColors}
                  parentIndex={idx}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </ul>
  );
}

/** -------------------------
 *  ENHANCED MARKDOWN CARD
 * ------------------------- */
const MultiSectionMarkdownCard = ({
  parsed,
  theme,
  fontSize,
  className = "",
}: EnhancedMarkdownCardProps) => {
  const { intro, sections, outro } = parsed;
  const themeColors = THEMES[theme];

  // Helper: Render text or link content
  const renderContent = (content: string, type: "text" | "title") => {
    const { urls, cleanText } = extractUrls(content);
    if (urls.length === 0) return content;

    return (
      <LinkDisplay url={urls[0]} className="w-full">
        <div className={type === "title" ? "font-bold" : ""}>
          {cleanText || "Link"}
        </div>
      </LinkDisplay>
    );
  };

  // --------------------------------------
  // RENDER A SINGLE SECTION (without tables)
  // --------------------------------------
  const renderSectionContent = useMemo(
    () =>
      (section: Section, sectionIndex: number, isFullWidth = true) => {
        const sectionKey = generateUniqueKey("section", sectionIndex);
        const nested = hasNestedItems(section.items);

        return (
          <div
            key={sectionKey}
            className={`${themeColors.container.background} border-3 ${themeColors.container.border} shadow-lg rounded-xl p-3 ${
              isFullWidth ? "w-full" : ""
            }`}
          >
            {/* Section Title */}
            <h2
              className={`text-2xl font-bold ${themeColors.title.text}`}
              >
              {renderContent(section.title, "title")}
            </h2>

            {/* Section Intro */}
            {section.intro && (
              <div className={`pt-2 text-lg ${themeColors.title.secondary}`}>
                {renderContent(section.intro, "text")}
              </div>
            )}

            {/* Section Items */}
            {section.items.length > 0 && (
              <>
                {nested ? (
                  /* If there's nesting, render a separate "nested" arrangement */
                  <div className={`mt-2 ${themeColors.item.background} p-1 rounded-md border-2 ${themeColors.item.border}`}>
                    <NestedList
                      items={section.items}
                      themeColors={themeColors}
                      parentIndex={sectionIndex}
                    />
                  </div>
                ) : (
                  /* If no nested items, render them as a single-level bullet list */
                  <ul className={`mt-1 space-y-2 ${themeColors.item.background}`}>
                    {section.items.map((item, itemIndex) => {
                      const itemKey = generateUniqueKey(
                        "item",
                        itemIndex,
                        sectionIndex
                      );
                      return (
                        <BulletCard
                          key={itemKey}
                          itemText={item.name}
                          itemKey={itemKey}
                          themeColors={themeColors}
                        />
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {/* Section Outro */}
            {section.outro && (
              <div className={`mt-2 space-y-2 ${themeColors.item.description}`}>
                {renderContent(section.outro, "text")}
              </div>
            )}
          </div>
        );
      },
    [themeColors]
  );

  // --------------------------------------
  // RENDER A SINGLE TABLE
  // --------------------------------------
  const renderTable = (
    table: { title: string; data: any },
    sectionIndex: number,
    tableIndex: number,
    fontSize?: number
  ) => {
    const tableKey = generateUniqueKey("table", tableIndex, sectionIndex);

    return (
      <div key={tableKey} className="w-full mt-6">
        <div
          className={`bg-white dark:bg-black/20 p-4 rounded-lg shadow-sm border ${themeColors.item.border}`}
        >
          <h3 className={`text-lg font-semibold ${themeColors.item.title} mb-4`}>
            {renderContent(table.title, "title")}
          </h3>
          <MarkdownTable
            data={table.data}
            fontSize={fontSize}
            theme={theme}
            className={className}
          />
        </div>
      </div>
    );
  };

  // --------------------------------------
  // PROCESS SECTIONS INTO GRID/FULL-WIDTH/TABLE BLOCKS
  // --------------------------------------
  const processedSections = useMemo(() => {
    const result: Array<{
      type: "grid" | "fullWidth" | "table";
      sections?: Section[];
      section?: Section;
      table?: any;
      sectionIndex?: number;
      tableIndex?: number;
    }> = [];
    let currentGridSections: Section[] = [];

    const flushGridSections = () => {
      if (currentGridSections.length > 0) {
        result.push({
          type: "grid",
          sections: [...currentGridSections],
        });
        currentGridSections = [];
      }
    };

    sections.forEach((section, index) => {
      if (section.tables.length > 0) {
        // Flush any pending grid sections
        flushGridSections();

        // If section has items, render it full-width
        if (section.items.length > 0) {
          result.push({
            type: "fullWidth",
            section,
          });
        }

        // Then add each table as a separate block
        section.tables.forEach((table, tableIndex) => {
          result.push({
            type: "table",
            table,
            sectionIndex: index,
            tableIndex,
          });
        });
      } else {
        // No tables => put this section in the grid
        currentGridSections.push(section);
      }
    });

    // Flush any remaining grid sections
    flushGridSections();

    return result;
  }, [sections]);

  // --------------------------------------
  // FINAL RENDER
  // --------------------------------------
  return (
    <div className="w-full p-1 space-y-4">
      {/* Intro - Always full width */}
      {intro && (
        <div
          className={`p-2 ${themeColors.item.background} border ${themeColors.item.border} rounded-md shadow-sm`}
        >
          <div className="text-gray-700 dark:text-gray-300">
            {renderContent(intro, "text")}
          </div>
        </div>
      )}

      {/* Process all sections with grid/fullWidth/table blocks */}
      {processedSections.map((item, index) => {
        if (item.type === "grid") {
          // Render sections side-by-side (or in a 1-2-3 column grid)
          return (
            <div
              key={`grid-${index}`}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {item.sections?.map((section, sectionIndex) =>
                renderSectionContent(section, sectionIndex)
              )}
            </div>
          );
        } else if (item.type === "table") {
          // Render a table block
          return renderTable(
            item.table!,
            item.sectionIndex!,
            item.tableIndex!,
            fontSize
          );
        } else {
          // Full width section
          return renderSectionContent(item.section!, index, true);
        }
      })}

      {/* Outro - Always full width */}
      {outro && (
        <div
          className={`p-2 ${themeColors.item.background} border ${themeColors.item.border} rounded-md shadow-sm`}
        >
          <div className="text-gray-700 dark:text-gray-300">
            {renderContent(outro, "text")}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSectionMarkdownCard;
