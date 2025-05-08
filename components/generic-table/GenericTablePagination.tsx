import React from "react";
import { Button } from "@/components/ui/button";
import {
    ChevronsLeft, 
    ChevronLeft, 
    ChevronsRight, 
    ChevronRight
} from "lucide-react";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

interface GenericTablePaginationProps {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
    pageSizeOptions?: number[];
    className?: string;
}

export default function GenericTablePagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    onItemsPerPageChange,
    pageSizeOptions = [10, 25, 50, 100],
    className = ""
}: GenericTablePaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    
    // Generate array of page numbers to display
    const getPageNumbers = () => {
        // Always show 5 pages when possible
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        // Adjust start page if we're near the end
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
        
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };
    
    // Check if button should be disabled
    const isFirstPageDisabled = currentPage <= 1;
    const isLastPageDisabled = currentPage >= totalPages;
    
    // Calculate displayed item range
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    return (
        <div className={`grid grid-cols-1 md:grid-cols-3 items-center gap-4 w-full border-t border-gray-200 dark:border-gray-600 pt-4 ${className}`}>
            {/* Left Column - Select */}
            <div className="flex justify-start">
                <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
                >
                    <SelectTrigger className="w-36 focus:ring-0 h-8">
                        <SelectValue placeholder={itemsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                        {pageSizeOptions.map(size => (
                            <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                        ))}
                        {totalItems > Math.max(...pageSizeOptions) && (
                            <SelectItem value={totalItems.toString()}>All</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
            
            {/* Middle Column - Text */}
            <div className="flex justify-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {totalItems > 0 ? startItem : 0} to {endItem} of {totalItems} entries
                </span>
            </div>
            
            {/* Right Column - Pagination Controls */}
            <div className="flex justify-end items-center space-x-1">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => onPageChange(1)}
                    disabled={isFirstPageDisabled}
                    className="w-8 h-8"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={isFirstPageDisabled}
                    className="w-8 h-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {getPageNumbers().map((page) => (
                    <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className="w-8 h-8 p-0"
                    >
                        {page}
                    </Button>
                ))}
                
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={isLastPageDisabled}
                    className="w-8 h-8"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => onPageChange(totalPages)}
                    disabled={isLastPageDisabled}
                    className="w-8 h-8"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}