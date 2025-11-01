"use client";

import React, { useState, useEffect } from "react";
import { StickyNote, CheckSquare, Table2, Globe, File, FolderKanban, ExternalLink, Youtube } from "lucide-react";
import FloatingSheet from "@/components/ui/matrx/FloatingSheet";
import type { Resource } from "./ResourceChips";
import FilePreviewSheet from "@/components/ui/file-preview/FilePreviewSheet";
import { createClient } from "@/utils/supabase/client";

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
                const tableId = resource.data.table_id;
                const tableName = resource.data.table_name;
                const referenceType = resource.data.type;
                
                if (referenceType === 'full_table') {
                    // Fetch all rows using RPC (limit to 100 for preview)
                    const { data: result, error } = await supabase
                        .rpc('get_user_table_data_paginated', {
                            p_table_id: tableId,
                            p_limit: 100,
                            p_offset: 0,
                            p_sort_field: null,
                            p_sort_direction: 'asc',
                            p_search_term: null
                        });
                    
                    if (error) throw error;
                    if (!result.success) throw new Error(result.error || 'Failed to load table data');
                    
                    // Transform data: result.data is array of { id, data } objects
                    const transformedData = result.data.map((row: any) => ({
                        id: row.id,
                        ...row.data
                    }));
                    setTableData(transformedData);
                } else if (referenceType === 'single_row') {
                    // Fetch specific row using RPC
                    const { data: result, error } = await supabase
                        .rpc('get_user_table_row', {
                            p_table_id: tableId,
                            p_row_id: resource.data.row_id
                        });
                    
                    if (error) throw error;
                    if (!result.success) throw new Error(result.error || 'Failed to load row data');
                    
                    // Transform: flatten the data object
                    const transformedData = [{
                        id: result.row.id,
                        ...result.row.data
                    }];
                    setTableData(transformedData);
                } else if (referenceType === 'single_column') {
                    // Fetch specific column from all rows
                    const { data: result, error } = await supabase
                        .rpc('get_user_table_data_paginated', {
                            p_table_id: tableId,
                            p_limit: 100,
                            p_offset: 0,
                            p_sort_field: null,
                            p_sort_direction: 'asc',
                            p_search_term: null
                        });
                    
                    if (error) throw error;
                    if (!result.success) throw new Error(result.error || 'Failed to load column data');
                    
                    // Extract just the requested column
                    const columnName = resource.data.column_name;
                    const transformedData = result.data.map((row: any) => ({
                        id: row.id,
                        [columnName]: row.data[columnName]
                    }));
                    setTableData(transformedData);
                } else if (referenceType === 'single_cell') {
                    // Fetch specific cell
                    const { data: result, error } = await supabase
                        .rpc('get_user_table_row', {
                            p_table_id: tableId,
                            p_row_id: resource.data.row_id
                        });
                    
                    if (error) throw error;
                    if (!result.success) throw new Error(result.error || 'Failed to load cell data');
                    
                    // Extract just the requested cell
                    const columnName = resource.data.column_name;
                    const transformedData = [{
                        id: result.row.id,
                        [columnName]: result.row.data[columnName]
                    }];
                    setTableData(transformedData);
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
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Reference Type: </span>
                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                        {resource.data.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    </span>
                                </div>
                                {tableData && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {tableData.length} row{tableData.length !== 1 ? 's' : ''}
                                    </span>
                                )}
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
                            ) : tableData && tableData.length > 0 ? (
                                <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-zinc-900 sticky top-0">
                                                <tr>
                                                    {Object.keys(tableData[0]).map(key => (
                                                        <th
                                                            key={key}
                                                            className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800"
                                                        >
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tableData.map((row: any, index: number) => (
                                                    <tr
                                                        key={index}
                                                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                                                    >
                                                        {Object.entries(row).map(([key, value]) => (
                                                            <td
                                                                key={key}
                                                                className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100"
                                                            >
                                                                {value !== null && value !== undefined
                                                                    ? typeof value === 'object'
                                                                        ? JSON.stringify(value)
                                                                        : String(value)
                                                                    : '-'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No data available</p>
                                </div>
                            )}

                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-700 dark:text-blue-400">
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

