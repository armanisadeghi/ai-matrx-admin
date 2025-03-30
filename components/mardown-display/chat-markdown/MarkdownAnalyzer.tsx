import { createChatSelectors } from "@/lib/redux/entity/custom-selectors/chatSelectors";
import { useAppSelector } from "@/lib/redux";
import React, { useState } from "react";

// Using the enums you provided
export enum LineCategory {
    HEADER = "header",
    BULLET = "bullet",
    SUB_BULLET = "sub_bullet",
    NUMBERED_LIST = "numbered_list",
    TABLE_ROW = "table_row",
    TABLE_DIVIDER = "table_divider",
    CODE_BLOCK_START = "code_block_start",
    CODE_BLOCK_END = "code_block_end",
    QUOTE = "quote",
    IMAGE = "image",
    LINK = "link",
    BOLD_TEXT = "bold_text",
    ITALIC_TEXT = "italic_text",
    ENTRY_AND_VALUE = "entry_and_value",
    LINE_BREAK = "line_break",
    OTHER_TEXT = "other_text",
}

export enum SegmentType {
    NUMBERED_LIST_MARKER_TEXT = "numbered_list_marker_text",
    BOLD_AND_ITALIC_TEXT = "bold_and_italic_text",
    BOLD_TEXT = "bold_text",
    ITALIC_TEXT = "italic_text",
    INLINE_CODE_TEXT = "inline_code_text",
    LINK_TITLE_TEXT = "link_title_text",
    LINK_URL_TEXT = "link_url_text",
    PLAIN_TEXT = "plain_text",
}

export enum SectionType {
    HORIZONTAL_RULE = "horizontal_rule",
    CODE_BLOCK = "code_block",
    TABLE = "table",
    ENTRIES_AND_VALUES = "entries_and_values",
    HEADER_WITH_BULLETS = "header_with_bullets",
    HEADER_WITH_NUMBERED_LIST = "header_with_numbered_list",
    HEADER_WITH_LIST = "header_with_list",
    HEADER_WITH_TEXT = "header_with_text",
    HEADER_WITH_TEXT_AND_LISTS = "header_with_text_and_lists",
    BOLD_TEXT_WITH_SUB_BULLETS = "bold_text_with_sub_bullets",
    BOLD_TEXT_WITH_MIXED_BULLETS = "bold_text_with_mixed_bullets",
    PLAIN_TEXT = "plain_text",
    BARE_HEADER = "bare_header",
    LIST = "list",
    TEXT_AND_LIST = "text_and_list",
}

export interface LineData {
    line: string;
    position: string;
    category: LineCategory;
    clean_line: string;
    segmentation: {
        segments: [SegmentType, string][];
    };
    metadata: {
        level: string;
        code_language: string;
        table_has_numerical_content: string;
        table_rows_count: string;
        table_column_count: string;
    };
}

export interface MarkdownAnalysisData {
    output: LineData[];
    analysis: any;
    related_id: string;
}

interface MarkdownAnalyzerProps {
    messageId?: string;
    mardownAnalysisData: MarkdownAnalysisData;
}

const MarkdownAnalyzer: React.FC<MarkdownAnalyzerProps> = ({ messageId, mardownAnalysisData }) => {
    const chatSelectors = createChatSelectors();

    const mardownAnalysis = useAppSelector((state) => chatSelectors.selectMarkdownAnalysisData(state, messageId));

    console.log("***mardownAnalysis", mardownAnalysis);


    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const output = mardownAnalysisData?.output || [];
    const analysis = mardownAnalysisData?.analysis || {};

    const toggleRow = (position: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [position]: !prev[position],
        }));
    };

    const getCategoryColor = (category: LineCategory) => {
        switch(category) {
          case LineCategory.HEADER:
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
          case LineCategory.BULLET:
          case LineCategory.SUB_BULLET:
          case LineCategory.NUMBERED_LIST:
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
          case LineCategory.TABLE_ROW:
          case LineCategory.TABLE_DIVIDER:
            return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
          case LineCategory.CODE_BLOCK_START:
          case LineCategory.CODE_BLOCK_END:
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
          case LineCategory.QUOTE:
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
          case LineCategory.IMAGE:
          case LineCategory.LINK:
            return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
          case LineCategory.BOLD_TEXT:
          case LineCategory.ITALIC_TEXT:
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
          case LineCategory.ENTRY_AND_VALUE:
            return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
          default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
      };
    
      // Helper function to get segment type badge color
      const getSegmentTypeColor = (type: SegmentType) => {
        switch(type) {
          case SegmentType.BOLD_TEXT:
          case SegmentType.BOLD_AND_ITALIC_TEXT:
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
          case SegmentType.ITALIC_TEXT:
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
          case SegmentType.INLINE_CODE_TEXT:
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
          case SegmentType.LINK_TITLE_TEXT:
          case SegmentType.LINK_URL_TEXT:
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
          case SegmentType.NUMBERED_LIST_MARKER_TEXT:
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
          case SegmentType.PLAIN_TEXT:
          default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
      };
    
      // Function to get relevant metadata (excluding "None" values)
      const getRelevantMetadata = (metadata: LineData['metadata']) => {
        return Object.entries(metadata).filter(([_, value]) => value !== 'None' && value !== '');
      };
    
      if (!output.length || !Object.keys(analysis).length) return (
        <div className="w-full p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-medium">Markdown Analysis Data is only available for messages that were just streamed.</h1>
        </div>
      );
    
      return (
        <div className="w-full overflow-x-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2 w-16">Pos</th>
                <th className="px-3 py-2 w-32">Category</th>
                <th className="px-3 py-2">Content</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {output.map((item) => (
                <React.Fragment key={item.position}>
                  <tr 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => toggleRow(item.position)}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-gray-800 dark:text-gray-300 align-top">
                      {item.position}
                      {item.metadata.level && item.metadata.level !== 'None' && (
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(L{item.metadata.level})</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                      {item.metadata.code_language && item.metadata.code_language !== 'None' && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.metadata.code_language}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-300">
                      <div className="flex items-start justify-between">
                        <div className="font-mono text-xs break-words text-gray-800 dark:text-gray-300 whitespace-pre-wrap pr-3">
                          {item.line}
                        </div>
                        <button className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none whitespace-nowrap">
                          {expandedRows[item.position] ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows[item.position] && (
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={3} className="px-4 py-3">
                        <div className="space-y-4">
                          {/* Segments Table */}
                          {item.segmentation.segments.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Segments</h4>
                              <table className="w-full text-xs border-collapse">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-2 py-1 text-left border border-gray-200 dark:border-gray-600">Type</th>
                                    <th className="px-2 py-1 text-left border border-gray-200 dark:border-gray-600">Content</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.segmentation.segments.map(([type, text], index) => (
                                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                                      <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 align-top">
                                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getSegmentTypeColor(type)}`}>
                                          {type}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 font-mono whitespace-pre-wrap">
                                        {text}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
    
                          {/* Metadata Table - only if there are relevant metadata */}
                          {getRelevantMetadata(item.metadata).length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Metadata</h4>
                              <table className="w-full text-xs border-collapse">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-2 py-1 text-left border border-gray-200 dark:border-gray-600">Key</th>
                                    <th className="px-2 py-1 text-left border border-gray-200 dark:border-gray-600">Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getRelevantMetadata(item.metadata).map(([key, value], index) => (
                                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                                      <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">{key}</td>
                                      <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">{value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
    
                          {/* Clean Line - if it exists */}
                          {item.clean_line && (
                            <div>
                              <h4 className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Clean Line</h4>
                              <div className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded font-mono text-xs whitespace-pre-wrap">
                                {item.clean_line}
                              </div>
                            </div>
                          )}
    
                          {/* Raw Data */}
                          <div>
                            <h4 className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Raw Data</h4>
                            <div className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                              <pre className="text-xs overflow-auto max-h-40">
                                {JSON.stringify(item, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      );
    };
    
    export default MarkdownAnalyzer;
    