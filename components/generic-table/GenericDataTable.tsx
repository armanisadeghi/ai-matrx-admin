"use client";
import React, { ReactNode, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StructuredSectionCard from "@/components/official/StructuredSectionCard";
import { ConfirmationDialog } from "@/features/applet/builder/parts/ConfirmationDialog";
import GenericTablePagination from "./GenericTablePagination";

export interface ColumnConfig<T> {
    key: string;
    header: React.ReactNode;
    width?: string;
    className?: string;
    sortable?: boolean;
    hidden?: boolean;
    render?: (item: T, index: number) => React.ReactNode;
}

interface StatusBadgeConfig {
    key: keyof any;
    isDirtyKey?: keyof any;
    isLocalKey?: keyof any;
    isPublicKey?: keyof any;
}

export interface ActionConfig<T> {
    icon: React.ReactNode;
    label?: string;
    onClick: (item: T, e: React.MouseEvent) => void;
    showCondition?: (item: T) => boolean;
    className?: string;
    badgeStyle?: boolean;
    badgeVariant?: "default" | "outline";
    badgeClassName?: string;
    requiresConfirmation?: boolean;
    confirmationProps?: {
        getTitle: (item: T) => string;
        getDescription: (item: T) => string;
        confirmButtonText: string;
    };
}

interface GenericDataTableProps<T> {
    items: T[];
    filteredItems: T[];
    paginatedItems: T[];
    isLoading: boolean;
    // Column configuration
    columns: ColumnConfig<T>[];
    idField: keyof T;
    iconField?: {
        key: keyof T;
        renderIcon: (item: T) => React.ReactNode;
    };
    labelField: keyof T;
    statusBadge?: StatusBadgeConfig;
    emptyState: {
        icon: React.ReactNode;
        title: string;
        description: string;
        buttonText: string;
        onButtonClick: () => void;
    };
    // Table settings
    title: string;
    headerActions: React.ReactNode[];
    // Row settings
    onRowClick?: (item: T) => void;
    // Sort settings
    sortBy: string;
    sortDirection: "asc" | "desc";
    onSortChange: (field: string) => void;
    // Actions config
    actions: ActionConfig<T>[];
    // Pagination settings
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
}

export default function GenericDataTable<T>({
    items,
    filteredItems,
    paginatedItems,
    isLoading,
    columns,
    idField,
    iconField,
    labelField,
    statusBadge,
    emptyState,
    title,
    headerActions,
    onRowClick,
    sortBy,
    sortDirection,
    onSortChange,
    actions,
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    onItemsPerPageChange,
}: GenericDataTableProps<T>) {
    // Confirmation dialog state
    const [itemToAction, setItemToAction] = useState<T | null>(null);
    const [currentAction, setCurrentAction] = useState<ActionConfig<T> | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Render status badge
    const renderStatusBadge = (item: T) => {
        if (!statusBadge) return null;
        
        const key = statusBadge.key;
        const isDirtyKey = statusBadge.isDirtyKey;
        const isLocalKey = statusBadge.isLocalKey;
        const isPublicKey = statusBadge.isPublicKey;
        
        if (isDirtyKey && item[isDirtyKey]) {
            return (
                <Badge
                    variant="outline"
                    className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                >
                    Unsaved
                </Badge>
            );
        } else if (isLocalKey && item[isLocalKey]) {
            return (
                <Badge
                    variant="outline"
                    className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                >
                    Local
                </Badge>
            );
        } else if (isPublicKey && item[isPublicKey]) {
            return (
                <Badge
                    variant="outline"
                    className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                >
                    Public
                </Badge>
            );
        } else {
            return (
                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/20">
                    Private
                </Badge>
            );
        }
    };
    
    // Render sort indicator
    const renderSortIndicator = (field: string) => {
        return sortBy === field ? (
            <span className="ml-1 inline-block w-4 text-center">
                {sortDirection === "asc" ? "↑" : "↓"}
            </span>
        ) : null;
    };
    
    // Render column header
    const renderColumnHeader = (column: ColumnConfig<T>) => {
        if (column.hidden) return null;
        
        const headerContent = (
            <div className="flex items-center space-x-1 justify-center">
                <span>{column.header}</span>
                {column.sortable && renderSortIndicator(column.key)}
            </div>
        );
        
        return (
            <TableHead 
                key={column.key}
                className={`${column.width || ''} ${column.className || ''} ${
                    column.sortable 
                        ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' 
                        : ''
                }`}
                onClick={() => column.sortable && onSortChange(column.key)}
            >
                {headerContent}
            </TableHead>
        );
    };
    
    // Handle action click
    const handleActionClick = (item: T, action: ActionConfig<T>, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click from triggering
        
        if (action.requiresConfirmation && action.confirmationProps) {
            setItemToAction(item);
            setCurrentAction(action);
        } else {
            // Execute action immediately if no confirmation required
            action.onClick(item, e);
        }
    };
    
    // Handle confirmed action
    const handleConfirmedAction = async () => {
        if (!itemToAction || !currentAction) return;
        
        try {
            setIsActionLoading(true);
            // Create a synthetic event (not used in most cases but included for compatibility)
            const syntheticEvent = { 
                stopPropagation: () => {}, 
                preventDefault: () => {} 
            } as React.MouseEvent;
            
            await currentAction.onClick(itemToAction, syntheticEvent);
            setItemToAction(null);
            setCurrentAction(null);
        } catch (error) {
            console.error("Failed to execute action:", error);
        } finally {
            setIsActionLoading(false);
        }
    };
    
    return (
        <StructuredSectionCard 
            title={title} 
            headerActions={headerActions} 
            className="mt-4"
        >
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                    {emptyState.icon}
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{emptyState.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
                        {emptyState.description}
                    </p>
                    <Button onClick={emptyState.onButtonClick}>{emptyState.buttonText}</Button>
                </div>
            ) : (
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {iconField && (
                                    <TableHead className="w-[50px]">Icon</TableHead>
                                )}
                                
                                {columns.map(renderColumnHeader)}
                                
                                {statusBadge && (
                                    <TableHead className="w-[120px] text-center">Status</TableHead>
                                )}
                                
                                {actions.length > 0 && (
                                    <TableHead className="w-[120px] text-right pr-2">Actions</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedItems.map((item, index) => (
                                <TableRow
                                    key={String(item[idField])}
                                    className={`group ${onRowClick ? 'cursor-pointer' : ''} hover:bg-gray-50 dark:hover:bg-gray-900/20 ${
                                        index % 2 === 1 ? "bg-gray-50 dark:bg-gray-900/10" : ""
                                    }`}
                                    onClick={() => onRowClick && onRowClick(item)}
                                >
                                    {iconField && (
                                        <TableCell className="font-medium">
                                            <div className="flex items-center justify-center">
                                                {iconField.renderIcon(item)}
                                            </div>
                                        </TableCell>
                                    )}
                                    
                                    {columns.map((column) => {
                                        if (column.hidden) return null;
                                        
                                        return (
                                            <TableCell key={column.key} className={column.className}>
                                                {column.render 
                                                    ? column.render(item, index) 
                                                    : String(item[column.key as keyof T] || '')}
                                            </TableCell>
                                        );
                                    })}
                                    
                                    {statusBadge && (
                                        <TableCell className="text-center">
                                            {renderStatusBadge(item)}
                                        </TableCell>
                                    )}
                                    
                                    {actions.length > 0 && (
                                        <TableCell className="text-right p-0 pr-2">
                                            <div className="flex justify-end space-x-1">
                                                {actions.map((action, actionIndex) => {
                                                    // Skip if the action has a show condition and it's false
                                                    if (action.showCondition && !action.showCondition(item)) {
                                                        return null;
                                                    }
                                                    
                                                    if (action.badgeStyle) {
                                                        return (
                                                            <Button
                                                                key={actionIndex}
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => handleActionClick(item, action, e)}
                                                                className={`opacity-70 group-hover:opacity-100 p-0 h-8 ${action.className || ''}`}
                                                            >
                                                                <Badge 
                                                                    variant={action.badgeVariant || "outline"} 
                                                                    className={action.badgeClassName || "bg-blue-50 dark:bg-blue-900/20 border-blue-500"}
                                                                >
                                                                    {action.label || 'Select'}
                                                                </Badge>
                                                            </Button>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <Button
                                                            key={actionIndex}
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleActionClick(item, action, e)}
                                                            className={`opacity-70 group-hover:opacity-100 p-1 h-8 w-8 ${action.className || ''}`}
                                                        >
                                                            {action.icon}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    {/* Pagination Footer */}
                    {filteredItems.length > 0 && (
                        <GenericTablePagination
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            currentPage={currentPage}
                            onPageChange={onPageChange}
                            onItemsPerPageChange={onItemsPerPageChange}
                        />
                    )}
                </div>
            )}
            
            {/* Confirmation Dialog */}
            {currentAction?.confirmationProps && (
                <ConfirmationDialog
                    open={!!itemToAction}
                    onOpenChange={(open) => !open && setItemToAction(null)}
                    handleDeleteGroup={handleConfirmedAction}
                    loading={isActionLoading}
                    title={itemToAction ? currentAction.confirmationProps.getTitle(itemToAction) : ''}
                    description={itemToAction ? currentAction.confirmationProps.getDescription(itemToAction) : ''}
                    deleteButtonText={currentAction.confirmationProps.confirmButtonText}
                />
            )}
        </StructuredSectionCard>
    );
}