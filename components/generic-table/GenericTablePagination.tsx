import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronLeft, ChevronsRight, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GenericTablePaginationProps {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
    pageSizeOptions?: number[];
    className?: string;
    showItemsPerPageSelect?: boolean;
    showPageInfo?: boolean;
    showPageControls?: boolean;
    maxPagesToShow?: number;
    containerClassName?: string;
    selectContainerClassName?: string;
    infoContainerClassName?: string;
    controlsContainerClassName?: string;
    pageButtonClassName?: string;
    pageActiveButtonClassName?: string;
    navButtonClassName?: string;
    showAllOption?: boolean;
    layoutType?: "grid" | "flex";
    labelFormat?: (start: number, end: number, total: number) => string;
    compact?: boolean;
    hideEntriesInfo?: boolean;
}

export default function GenericTablePagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    onItemsPerPageChange,
    pageSizeOptions = [5, 10, 25, 50, 100],
    className = "",
    showItemsPerPageSelect = true,
    showPageInfo = true,
    showPageControls = true,
    maxPagesToShow = 5,
    containerClassName = "",
    selectContainerClassName = "",
    infoContainerClassName = "",
    controlsContainerClassName = "",
    pageButtonClassName = "",
    pageActiveButtonClassName = "",
    navButtonClassName = "",
    showAllOption = true,
    layoutType = "grid",
    labelFormat,
    compact = false,
    hideEntriesInfo = false,
}: GenericTablePaginationProps) {
    // State to keep track of available page size options including custom values
    const [availablePageSizes, setAvailablePageSizes] = useState<number[]>(pageSizeOptions);

    // Ensure the current itemsPerPage is in the available options
    useEffect(() => {
        if (!availablePageSizes.includes(itemsPerPage)) {
            // Add the current value to the available options if it's not already there
            setAvailablePageSizes((prev) => [...prev, itemsPerPage].sort((a, b) => a - b));
        }
    }, [itemsPerPage, availablePageSizes]);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    const getPageNumbers = () => {
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    const isFirstPageDisabled = currentPage <= 1;
    const isLastPageDisabled = currentPage >= totalPages;
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const defaultLabelFormat = (start: number, end: number, total: number) => {
        return compact ? `${start}-${end} of ${total}` : `Showing ${start} to ${end} of ${total} entries`;
    };

    const formatLabel = labelFormat || defaultLabelFormat;

    const buttonSize = compact ? "sm" : "icon";
    const buttonWidth = compact ? "w-6" : "w-8";
    const buttonHeight = compact ? "h-6" : "h-8";
    const buttonPadding = compact ? "p-0 text-xs" : "p-0";

    const containerClass =
        layoutType === "grid"
            ? `grid grid-cols-1 md:grid-cols-3 items-center gap-4 w-full border-t border-gray-200 dark:border-gray-600 pt-4 ${className} ${containerClassName}`
            : `flex flex-wrap items-center justify-between gap-2 w-full border-t border-gray-200 dark:border-gray-600 pt-4 ${className} ${containerClassName}`;

    return (
        <div className={containerClass}>
            {/* Items Per Page Select */}
            {showItemsPerPageSelect && (
                <div className={`flex justify-start ${selectContainerClassName}`}>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(parseInt(value))}>
                        <SelectTrigger className={`${compact ? "w-20 h-6 text-xs" : "w-36 h-8"} focus:ring-0`}>
                            <SelectValue placeholder={itemsPerPage.toString()} />
                        </SelectTrigger>
                        <SelectContent>
                            {availablePageSizes.map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                            {showAllOption && totalItems > Math.max(...availablePageSizes) && (
                                <SelectItem value={totalItems.toString()}>All</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className={`flex justify-center ${infoContainerClassName}`}>
            {/* Page Info - only show if not hidden But always show the div. */}
            {showPageInfo && !hideEntriesInfo && (
                    <span className={`${compact ? "text-xs" : "text-sm"} text-gray-600 dark:text-gray-400`}>
                        {formatLabel(startItem, endItem, totalItems)}
                    </span>
                )}
            </div>

            {/* Page Controls */}
            {showPageControls && (
                <div className={`flex justify-end items-center space-x-1 ${controlsContainerClassName}`}>
                    <Button
                        variant="outline"
                        size={buttonSize}
                        onClick={() => onPageChange(1)}
                        disabled={isFirstPageDisabled}
                        className={`${buttonWidth} ${buttonHeight} ${navButtonClassName}`}
                    >
                        <ChevronsLeft className={`${compact ? "h-3 w-3" : "h-4 w-4"}`} />
                    </Button>

                    <Button
                        variant="outline"
                        size={buttonSize}
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={isFirstPageDisabled}
                        className={`${buttonWidth} ${buttonHeight} ${navButtonClassName}`}
                    >
                        <ChevronLeft className={`${compact ? "h-3 w-3" : "h-4 w-4"}`} />
                    </Button>

                    {getPageNumbers().map((page) => (
                        <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size={buttonSize}
                            onClick={() => onPageChange(page)}
                            className={`${buttonWidth} ${buttonHeight} ${buttonPadding} ${
                                currentPage === page ? pageActiveButtonClassName : pageButtonClassName
                            }`}
                        >
                            {page}
                        </Button>
                    ))}

                    <Button
                        variant="outline"
                        size={buttonSize}
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={isLastPageDisabled}
                        className={`${buttonWidth} ${buttonHeight} ${navButtonClassName}`}
                    >
                        <ChevronRight className={`${compact ? "h-3 w-3" : "h-4 w-4"}`} />
                    </Button>

                    <Button
                        variant="outline"
                        size={buttonSize}
                        onClick={() => onPageChange(totalPages)}
                        disabled={isLastPageDisabled}
                        className={`${buttonWidth} ${buttonHeight} ${navButtonClassName}`}
                    >
                        <ChevronsRight className={`${compact ? "h-3 w-3" : "h-4 w-4"}`} />
                    </Button>
                </div>
            )}
        </div>
    );
}
