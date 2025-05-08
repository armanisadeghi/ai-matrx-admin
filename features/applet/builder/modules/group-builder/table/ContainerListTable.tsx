"use client";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { useRouter } from "next/navigation";
import { selectAllContainers, selectContainerLoading } from "@/lib/redux/app-builder/selectors/containerSelectors";
import { deleteContainerThunk } from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { Button } from "@/components/ui/button";
import {
    Eye,
    Pencil,
    Box,
    Trash2,
    LayoutGrid
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContainerBuilder } from "@/lib/redux/app-builder/types";
import StructuredSectionCard from "@/components/official/StructuredSectionCard";
import { ConfirmationDialog } from "@/features/applet/builder/parts/ConfirmationDialog";
import TablePagination from "./TablePagination";
import TableHeaderComponent from "./TableHeader";

interface ContainerListTableProps {
    onContainerView?: (id: string) => void;
    onContainerEdit?: (id: string) => void;
    onContainerDelete?: (id: string) => void;
    onContainerSelect?: (id: string) => void;
    onContainerCreate?: () => void;
}

export default function ContainerListTable({ 
    onContainerView, 
    onContainerEdit, 
    onContainerDelete, 
    onContainerSelect, 
    onContainerCreate 
}: ContainerListTableProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    
    // Get containers from Redux
    const containers = useAppSelector(selectAllContainers);
    const isLoading = useAppSelector(selectContainerLoading);
    
    // Local state for search/filter
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredContainers, setFilteredContainers] = useState<ContainerBuilder[]>([]);
    const [containerToDelete, setContainerToDelete] = useState<string | null>(null);
    const [containerNameToDelete, setContainerNameToDelete] = useState<string>("");
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Sorting state
    type SortField = "label" | "shortLabel" | "description" | "fields";
    const [sortBy, setSortBy] = useState<SortField>("label");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [paginatedContainers, setPaginatedContainers] = useState<ContainerBuilder[]>([]);
    
    // Apply search/filter and sorting whenever containers, search term, or sort params change
    useEffect(() => {
        let filtered = containers;
        
        // Apply search filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(
                (container) =>
                    container.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    container.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    container.shortLabel?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case "label":
                    comparison = (a.label || "").localeCompare(b.label || "");
                    break;
                case "shortLabel":
                    comparison = (a.shortLabel || "").localeCompare(b.shortLabel || "");
                    break;
                case "description":
                    comparison = (a.description || "").localeCompare(b.description || "");
                    break;
                case "fields":
                    comparison = a.fields.length - b.fields.length;
                    break;
                default:
                    comparison = (a.label || "").localeCompare(b.label || "");
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });
        
        setFilteredContainers(sorted);
        
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [containers, searchTerm, sortBy, sortDirection]);
    
    // Apply pagination
    useEffect(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        setPaginatedContainers(filteredContainers.slice(startIndex, endIndex));
    }, [filteredContainers, currentPage, itemsPerPage]);
    
    // Handle sort click
    const handleSortClick = (field: SortField) => {
        if (sortBy === field) {
            // Toggle direction if clicking the same field
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new field and default to ascending
            setSortBy(field);
            setSortDirection("asc");
        }
    };
    
    // Render sort indicator
    const renderSortIndicator = (field: SortField) => {
        return <span className="ml-1 inline-block w-4 text-center">{sortBy === field ? (sortDirection === "asc" ? "↑" : "↓") : ""}</span>;
    };
    
    // Navigation handlers
    const handleViewContainer = (id: string) => {
        onContainerView?.(id);
        if (onContainerSelect) {
            onContainerSelect(id);
        }
    };
    
    const handleEditContainer = (id: string) => {
        onContainerEdit?.(id);
    };
    
    const handleCreateContainer = () => {
        if (onContainerCreate) {
            onContainerCreate();
        } else {
            router.push("/apps/app-builder/containers/create");
        }
    };
    
    // Delete handlers
    const handleDeleteClick = (id: string, label: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click from triggering
        setContainerToDelete(id);
        setContainerNameToDelete(label || "Unnamed Container");
    };
    
    const handleDeleteContainer = async () => {
        if (!containerToDelete) return;
        
        try {
            setIsDeleting(true);
            if (onContainerDelete) {
                onContainerDelete(containerToDelete);
                setContainerToDelete(null);
            } else {
                await dispatch(deleteContainerThunk(containerToDelete)).unwrap();
                setContainerToDelete(null);
            }
        } catch (error) {
            console.error("Failed to delete container:", error);
        } finally {
            setIsDeleting(false);
        }
    };
    
    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };
    
    // Handle pagination changes
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };
    
    const handleItemsPerPageChange = (items: number) => {
        setItemsPerPage(items);
        setCurrentPage(1); // Reset to first page when changing items per page
    };
    
    return (
        <StructuredSectionCard 
            title="All Containers" 
            headerActions={[
                <TableHeaderComponent 
                    key="table-header"
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onCreateContainer={handleCreateContainer}
                />
            ]} 
            className="mt-4"
        >
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : containers.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Box className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Containers Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
                        You haven't created any containers yet. Containers let you group related fields together for use in your
                        applets.
                    </p>
                    <Button onClick={handleCreateContainer}>Create First Container</Button>
                </div>
            ) : (
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">Icon</TableHead>
                                <TableHead
                                    className="w-[200px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                    onClick={() => handleSortClick("label")}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>Label</span>
                                        {renderSortIndicator("label")}
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="w-[200px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                    onClick={() => handleSortClick("shortLabel")}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>Short Label</span>
                                        {renderSortIndicator("shortLabel")}
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="hidden md:table-cell cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                    onClick={() => handleSortClick("description")}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>Description</span>
                                        {renderSortIndicator("description")}
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="w-[100px] text-center cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                    onClick={() => handleSortClick("fields")}
                                >
                                    <div className="flex items-center justify-center space-x-1">
                                        <span>Fields</span>
                                        {renderSortIndicator("fields")}
                                    </div>
                                </TableHead>
                                <TableHead className="w-[120px] text-center">Status</TableHead>
                                <TableHead className="w-[160px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedContainers.map((container, index) => (
                                <TableRow
                                    key={container.id}
                                    className={`group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 ${
                                        index % 2 === 1 ? "bg-gray-50 dark:bg-gray-900/10" : ""
                                    }`}
                                    onClick={() => handleViewContainer(container.id)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center justify-center">
                                            <LayoutGrid className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            {container.label ? (
                                                <span>{container.label}</span>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400">Unnamed Container</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {container.shortLabel ? (
                                            <span>{container.shortLabel}</span>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">None</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {container.description ? (
                                            <span className="line-clamp-1 max-w-xs">{container.description}</span>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">No description</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="outline"
                                            className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                        >
                                            {container.fields.length}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {container.isDirty ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                            >
                                                Unsaved
                                            </Badge>
                                        ) : container.isLocal ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                                            >
                                                Local
                                            </Badge>
                                        ) : container.isPublic ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                            >
                                                Public
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/20">
                                                Private
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewContainer(container.id);
                                                }}
                                                className="opacity-70 group-hover:opacity-100"
                                            >
                                                {onContainerSelect ? (
                                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 border-blue-500">
                                                        Select
                                                    </Badge>
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                            {onContainerEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditContainer(container.id);
                                                    }}
                                                    className="opacity-70 group-hover:opacity-100"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleDeleteClick(container.id, container.label || "Unnamed Container", e)}
                                                className="opacity-70 group-hover:opacity-100 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    {/* Pagination Footer */}
                    {filteredContainers.length > 0 && (
                        <TablePagination
                            totalItems={filteredContainers.length}
                            itemsPerPage={itemsPerPage}
                            currentPage={currentPage}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    )}
                </div>
            )}
            <ConfirmationDialog
                open={!!containerToDelete}
                onOpenChange={(open) => !open && setContainerToDelete(null)}
                handleDeleteGroup={handleDeleteContainer}
                loading={isDeleting}
                title={`Delete Container: ${containerNameToDelete}`}
                description={`This action cannot be undone. This will permanently delete "${containerNameToDelete}" and remove it from any layouts that use it.`}
                deleteButtonText="Delete Container"
            />
        </StructuredSectionCard>
    );
}