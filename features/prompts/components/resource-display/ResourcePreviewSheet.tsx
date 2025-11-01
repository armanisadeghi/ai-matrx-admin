"use client";

import React, { useState, useEffect } from "react";
import { StickyNote, CheckSquare, Table2, Globe, File, FolderKanban, ExternalLink, Youtube } from "lucide-react";
import FloatingSheet from "@/components/ui/matrx/FloatingSheet";
import type { Resource } from "./ResourceChips";
import FilePreviewSheet from "@/components/ui/file-preview/FilePreviewSheet";
import { createClient } from "@/utils/supabase/client";
import UserTableViewer from "@/components/user-generated-table-data/UserTableViewer";

interface ResourcePreviewSheetProps {
    isOpen: boolean;
    onClose: () => void;
    resource: Resource;
}

const ResourcePreviewSheet: React.FC<ResourcePreviewSheetProps> = ({ isOpen, onClose, resource }) => {
    const [tableData, setTableData] = useState<any>(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [tableError, setTableError] = useState<string | null>(null);
    const supabase = createClient();

    // Fetch table data when resource is a table
    useEffect(() => {
        const fetchTableData = async () => {
            if (resource.type !== "table" || !isOpen) return;
            
            setTableLoading(true);
            setTableError(null);
            
            try {
                const referenceType = resource.data.type;
                const ref = resource.data; // Pass entire reference object
                
                if (referenceType === 'full_table') {
                    // For full table, we'll use the UserTableViewer component directly
                    // So we don't need to fetch data here
                    setTableData({ type: 'full_table' });
                    setTableLoading(false);
                    return;
                }
                
                if (referenceType === 'table_row') {
                    // Fetch specific row using new RPC
                    const { data: row, error } = await supabase
                        .rpc('get_table_row', { ref });
                    
                    if (error) throw error;
                    if (!row) throw new Error('Row not found');
                    
                    setTableData({
                        type: 'table_row',
                        row: row
                    });
                } else if (referenceType === 'table_column') {
                    // Fetch column definition and row values
                    const [columnResult, rowsResult] = await Promise.all([
                        supabase.rpc('get_table_column', { ref }),
                        supabase.rpc('list_table_rows', { 
                            ref: { 
                                type: 'full_table', 
                                table_id: resource.data.table_id 
                            },
                            limit_rows: 100,
                            offset_rows: 0
                        })
                    ]);
                    
                    if (columnResult.error) throw columnResult.error;
                    if (rowsResult.error) throw rowsResult.error;
                    
                    setTableData({
                        type: 'table_column',
                        column: columnResult.data,
                        rows: rowsResult.data?.rows || [],
                        total: rowsResult.data?.total || 0,
                        columnName: resource.data.column_name,
                        columnDisplayName: resource.data.column_display_name
                    });
                } else if (referenceType === 'table_cell') {
                    // Fetch specific cell value using new RPC
                    const { data: cellData, error } = await supabase
                        .rpc('get_table_cell', { ref });
                    
                    if (error) throw error;
                    if (!cellData) throw new Error('Cell not found');
                    
                    setTableData({
                        type: 'table_cell',
                        value: cellData.value,
                        field: cellData.field,
                        rowId: resource.data.row_id,
                        columnName: resource.data.column_name,
                        columnDisplayName: resource.data.column_display_name
                    });
                }
            } catch (error) {
                console.error('Error fetching table data:', error);
                setTableError(error instanceof Error ? error.message : 'Failed to fetch table data');
            } finally {
                setTableLoading(false);
            }
        };
        
        fetchTableData();
    }, [resource, isOpen, supabase]);

    // For file resources, use existing FilePreviewSheet
    if (resource.type === "file") {
        return (
            <FilePreviewSheet
                isOpen={isOpen}
                onClose={onClose}
                file={resource.data}
            />
        );
    }

    // For other resource types, use custom Sheet
    const getResourceTitle = () => {
        switch (resource.type) {
            case "note":
                return resource.data.label || "Note";
            case "task":
                return resource.data.title || "Task";
            case "project":
                return resource.data.name || "Project";
            case "table":
                return resource.data.table_name || "Table";
            case "webpage":
                return resource.data.title || "Webpage";
            case "youtube":
                return resource.data.title || "YouTube Video";
            default:
                return "Resource";
        }
    };

    const getResourceIcon = () => {
        switch (resource.type) {
            case "note":
                return <StickyNote className="w-5 h-5 text-orange-600 dark:text-orange-500" />;
            case "task":
                return <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-500" />;
            case "project":
                return <FolderKanban className="w-5 h-5 text-purple-600 dark:text-purple-500" />;
            case "table":
                return <Table2 className="w-5 h-5 text-green-600 dark:text-green-500" />;
            case "webpage":
                return <Globe className="w-5 h-5 text-teal-600 dark:text-teal-500" />;
            case "youtube":
                return <Youtube className="w-5 h-5 text-red-600 dark:text-red-500" />;
            default:
                return <File className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
        }
    };

    return (
        <FloatingSheet
            isOpen={isOpen}
            onClose={onClose}
            position="right"
            width="3xl"
            height="xl"
            title={
                <div className="flex items-center gap-2">
                    {getResourceIcon()}
                    <span>{getResourceTitle()}</span>
                </div>
            }
            description="Resource Preview"
            showCloseButton={true}
            closeOnBackdropClick={true}
            rounded="lg"
            contentClassName="p-6"
        >
            <div className="space-y-6">
                    {/* Note Preview */}
                    {resource.type === "note" && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    Content
                                </h3>
                                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans">
                                        {resource.data.content || "No content"}
                                    </pre>
                                </div>
                            </div>

                            {resource.data.folder_name && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Folder: </span>
                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                        {resource.data.folder_name}
                                    </span>
                                </div>
                            )}

                            {resource.data.tags && resource.data.tags.length > 0 && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Tags:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {resource.data.tags.map((tag: string) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 text-xs rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Task Preview */}
                    {resource.type === "task" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <CheckSquare className={`w-5 h-5 ${
                                    resource.data.status === 'completed' 
                                        ? 'text-green-600 dark:text-green-500' 
                                        : 'text-gray-400 dark:text-gray-500'
                                }`} />
                                <span className={`text-sm font-medium ${
                                    resource.data.status === 'completed'
                                        ? 'text-gray-500 dark:text-gray-400 line-through'
                                        : 'text-gray-900 dark:text-gray-100'
                                }`}>
                                    {resource.data.status === 'completed' ? 'Completed' : 'Pending'}
                                </span>
                            </div>

                            {resource.data.description && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                        Description
                                    </h3>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {resource.data.description}
                                    </p>
                                </div>
                            )}

                            {resource.data.priority && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Priority: </span>
                                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                                        resource.data.priority === 'high' 
                                            ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                                            : resource.data.priority === 'medium'
                                            ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400'
                                            : 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                                    }`}>
                                        {resource.data.priority}
                                    </span>
                                </div>
                            )}

                            {resource.data.due_date && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Due: </span>
                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                        {new Date(resource.data.due_date).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Project Preview */}
                    {resource.type === "project" && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    Tasks
                                </h3>
                                <div className="space-y-2">
                                    {resource.data.tasks && resource.data.tasks.length > 0 ? (
                                        resource.data.tasks.map((task: any) => (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded border border-gray-200 dark:border-gray-800"
                                            >
                                                <CheckSquare className={`w-4 h-4 ${
                                                    task.status === 'completed'
                                                        ? 'text-green-600 dark:text-green-500'
                                                        : 'text-gray-400 dark:text-gray-500'
                                                }`} />
                                                <span className={`text-sm flex-1 ${
                                                    task.status === 'completed'
                                                        ? 'text-gray-500 dark:text-gray-400 line-through'
                                                        : 'text-gray-900 dark:text-gray-100'
                                                }`}>
                                                    {task.title}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No tasks</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table Preview */}
                    {resource.type === "table" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Reference Type: </span>
                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                        {resource.data.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    </span>
                                </div>
                            </div>

                            {tableLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                    <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading data...</span>
                                </div>
                            ) : tableError ? (
                                <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-700 dark:text-red-400">{tableError}</p>
                                </div>
                            ) : tableData ? (
                                <>
                                    {/* Full Table Preview */}
                                    {tableData.type === 'full_table' && (
                                        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                                            <UserTableViewer 
                                                tableId={resource.data.table_id}
                                                showTableSelector={false}
                                            />
                                        </div>
                                    )}

                                    {/* Single Row Preview */}
                                    {tableData.type === 'table_row' && tableData.row && (
                                        <div className="space-y-2">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                                    <strong>Row ID:</strong> {tableData.row.id}
                                                </p>
                                            </div>
                                            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 dark:bg-zinc-900 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Row Data</h4>
                                                </div>
                                                <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                                                    {Object.entries(tableData.row.data).map(([fieldName, value]: [string, any]) => (
                                                        <div key={fieldName} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-zinc-900 rounded">
                                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[120px]">
                                                                {fieldName}:
                                                            </span>
                                                            <span className="text-xs text-gray-900 dark:text-gray-100 flex-1">
                                                                {value !== null && value !== undefined
                                                                    ? typeof value === 'object'
                                                                        ? JSON.stringify(value, null, 2)
                                                                        : String(value)
                                                                    : '-'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Single Column Preview */}
                                    {tableData.type === 'table_column' && tableData.rows && (
                                        <div className="space-y-2">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                                    <strong>Column:</strong> {tableData.columnDisplayName || tableData.columnName}
                                                    {tableData.column && (
                                                        <>
                                                            <br />
                                                            <strong>Type:</strong> {tableData.column.data_type || 'Unknown'}
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 dark:bg-zinc-900 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        Column Values ({tableData.rows.length} of {tableData.total || tableData.rows.length} rows)
                                                    </h4>
                                                </div>
                                                <div className="max-h-96 overflow-y-auto">
                                                    {tableData.rows.length === 0 ? (
                                                        <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                                            No rows found
                                                        </div>
                                                    ) : (
                                                        tableData.rows.map((row: any) => {
                                                            const cellValue = row.data[tableData.columnName];
                                                            return (
                                                                <div 
                                                                    key={row.id}
                                                                    className="p-2 border-b border-gray-200 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                                                                >
                                                                    <div className="text-xs text-gray-900 dark:text-gray-100">
                                                                        {cellValue !== null && cellValue !== undefined
                                                                            ? typeof cellValue === 'object'
                                                                                ? JSON.stringify(cellValue)
                                                                                : String(cellValue)
                                                                            : '-'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                            {tableData.total > 100 && (
                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                                                    Showing first 100 of {tableData.total} rows
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Single Cell Preview */}
                                    {tableData.type === 'table_cell' && (
                                        <div className="space-y-2">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                                    <strong>Column:</strong> {tableData.columnDisplayName || tableData.columnName}<br />
                                                    <strong>Row ID:</strong> {tableData.rowId}
                                                </p>
                                            </div>
                                            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 dark:bg-zinc-900 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cell Value</h4>
                                                </div>
                                                <div className="p-4">
                                                    <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                                        {tableData.value !== null && tableData.value !== undefined
                                                            ? typeof tableData.value === 'object'
                                                                ? JSON.stringify(tableData.value, null, 2)
                                                                : String(tableData.value)
                                                            : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No data available</p>
                                </div>
                            )}

                            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="text-xs text-green-700 dark:text-green-400">
                                    {resource.data.description}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Webpage Preview */}
                    {resource.type === "webpage" && (
                        <div className="space-y-4">
                            <div>
                                <a
                                    href={resource.data.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    {resource.data.url}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Content
                                    </h3>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {resource.data.charCount?.toLocaleString() || 0} characters
                                    </span>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800 max-h-96 overflow-y-auto">
                                    <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
                                        {resource.data.textContent}
                                    </pre>
                                </div>
                            </div>

                            {resource.data.scrapedAt && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Scraped: </span>
                                    <span className="text-xs text-gray-900 dark:text-gray-100">
                                        {new Date(resource.data.scrapedAt).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* YouTube Preview */}
                    {resource.type === "youtube" && (
                        <div className="space-y-4">
                            {/* Video Embed */}
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                <iframe
                                    src={`https://www.youtube.com/embed/${resource.data.videoId}`}
                                    title={resource.data.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                />
                            </div>

                            {/* Video Info */}
                            <div className="space-y-3">
                                {resource.data.channelName && (
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Channel: </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {resource.data.channelName}
                                        </span>
                                    </div>
                                )}

                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Video ID: </span>
                                    <code className="text-xs text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-zinc-900 px-2 py-0.5 rounded">
                                        {resource.data.videoId}
                                    </code>
                                </div>

                                <div>
                                    <a
                                        href={resource.data.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                        Watch on YouTube
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
        </FloatingSheet>
    );
};

export default ResourcePreviewSheet;


