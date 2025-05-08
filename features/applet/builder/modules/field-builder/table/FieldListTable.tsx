"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { useRouter } from "next/navigation";
import { selectAllFields, selectFieldLoading } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { deleteFieldThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { Button } from "@/components/ui/button";
import {
    Eye,
    Pencil,
    TextCursorInput,
    Trash2,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FieldBuilder } from "@/lib/redux/app-builder/types";
import StructuredSectionCard from "@/components/official/StructuredSectionCard";
import { ICON_OPTIONS } from "@/features/applet/layouts/helpers/StyledComponents";
import { ConfirmationDialog } from "@/features/applet/builder/parts/ConfirmationDialog";
import { getComponentIcon, getComponentTypeName } from "@/features/applet/builder/modules/field-builder/field-constants";
import TablePagination from "./TablePagination";
import TableHeaderComponent from "./TableHeader";

interface FieldListTableProps {
    onFieldView?: (id: string) => void;
    onFieldEdit?: (id: string) => void;
    onFieldDelete?: (id: string) => void;
    onFieldSelect?: (id: string) => void;
    onFieldCreate?: () => void;
}

export default function FieldListTable({ onFieldView, onFieldEdit, onFieldDelete, onFieldSelect, onFieldCreate }: FieldListTableProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Get fields from Redux
    const fields = useAppSelector(selectAllFields);
    const isLoading = useAppSelector(selectFieldLoading);

    // Local state for search/filter
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredFields, setFilteredFields] = useState<FieldBuilder[]>([]);
    const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
    const [fieldNameToDelete, setFieldNameToDelete] = useState<string>("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Sorting state
    type SortField = "label" | "component" | "description" | "required";
    const [sortBy, setSortBy] = useState<SortField>("label");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [paginatedFields, setPaginatedFields] = useState<FieldBuilder[]>([]);

    // Apply search/filter and sorting whenever fields, search term, or sort params change
    useEffect(() => {
        let filtered = fields;

        // Apply search filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(
                (field) =>
                    field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    field.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    field.component?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case "label":
                    comparison = (a.label || "").localeCompare(b.label || "");
                    break;
                case "component":
                    comparison = (a.component || "").localeCompare(b.component || "");
                    break;
                case "description":
                    comparison = (a.description || "").localeCompare(b.description || "");
                    break;
                case "required":
                    comparison = a.required === b.required ? 0 : a.required ? -1 : 1;
                    break;
                default:
                    comparison = (a.label || "").localeCompare(b.label || "");
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });

        setFilteredFields(sorted);
        
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [fields, searchTerm, sortBy, sortDirection]);
    
    // Apply pagination
    useEffect(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        setPaginatedFields(filteredFields.slice(startIndex, endIndex));
    }, [filteredFields, currentPage, itemsPerPage]);

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
    const handleViewField = (id: string) => {
        onFieldView?.(id);
        if (onFieldSelect) {
            onFieldSelect(id);
        }
    };

    const handleEditField = (id: string) => {
        onFieldEdit?.(id);
    };

    const handleCreateField = () => {
        if (onFieldCreate) {
            onFieldCreate();
        } else {
            router.push("/apps/app-builder/fields/create");
        }
    };

    // Delete handlers
    const handleDeleteClick = (id: string, label: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click from triggering
        setFieldToDelete(id);
        setFieldNameToDelete(label || "Unnamed Field");
    };

    const handleDeleteField = async () => {
        if (!fieldToDelete) return;

        try {
            setIsDeleting(true);
            if (onFieldDelete) {
                onFieldDelete(fieldToDelete);
                setFieldToDelete(null);
            } else {
                await dispatch(deleteFieldThunk(fieldToDelete)).unwrap();
                setFieldToDelete(null);
            }
        } catch (error) {
            console.error("Failed to delete field:", error);
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

    // Render icon helper function
    const renderIcon = (field: FieldBuilder) => {
        // If a custom icon is set, use it from the ICON_OPTIONS
        if (field.iconName) {
            const IconComponent = ICON_OPTIONS[field.iconName];
            if (IconComponent) {
                return <IconComponent className="h-5 w-5 text-gray-700 dark:text-gray-300" />;
            }
        }

        // Otherwise use an icon based on the component type
        return getComponentIcon(field.component);
    };

    return (
        <StructuredSectionCard 
            title="All Field Components" 
            headerActions={[
                <TableHeaderComponent 
                    key="table-header"
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onCreateField={handleCreateField}
                />
            ]} 
            className="mt-4"
        >
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : fields.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                    <TextCursorInput className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Field Components Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
                        You haven't created any field components yet. Field components are reusable form elements that can be used in your
                        applets.
                    </p>
                    <Button onClick={handleCreateField}>Create First Field</Button>
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
                                    onClick={() => handleSortClick("component")}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>Component Type</span>
                                        {renderSortIndicator("component")}
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
                                    onClick={() => handleSortClick("required")}
                                >
                                    <div className="flex items-center justify-center space-x-1">
                                        <span>Required</span>
                                        {renderSortIndicator("required")}
                                    </div>
                                </TableHead>
                                <TableHead className="w-[120px] text-center">Status</TableHead>
                                <TableHead className="w-[160px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedFields.map((field, index) => (
                                <TableRow
                                    key={field.id}
                                    className={`group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 ${
                                        index % 2 === 1 ? "bg-gray-50 dark:bg-gray-900/10" : ""
                                    }`}
                                    onClick={() => handleViewField(field.id)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center justify-center">{renderIcon(field)}</div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            {field.label ? (
                                                <span>{field.label}</span>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400">Unnamed Field</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getComponentTypeName(field.component)}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {field.description ? (
                                            <span className="line-clamp-1 max-w-xs">{field.description}</span>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">No description</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {field.required ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                            >
                                                Required
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/20">
                                                Optional
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {field.isDirty ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                            >
                                                Unsaved
                                            </Badge>
                                        ) : field.isLocal ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                                            >
                                                Local
                                            </Badge>
                                        ) : field.isPublic ? (
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
                                                    handleViewField(field.id);
                                                }}
                                                className="opacity-70 group-hover:opacity-100"
                                            >
                                                {onFieldSelect ? (
                                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 border-blue-500">
                                                        Select
                                                    </Badge>
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                            {onFieldEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditField(field.id);
                                                    }}
                                                    className="opacity-70 group-hover:opacity-100"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleDeleteClick(field.id, field.label || "Unnamed Field", e)}
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
                    {filteredFields.length > 0 && (
                        <TablePagination
                            totalItems={filteredFields.length}
                            itemsPerPage={itemsPerPage}
                            currentPage={currentPage}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    )}
                </div>
            )}

            <ConfirmationDialog
                open={!!fieldToDelete}
                onOpenChange={(open) => !open && setFieldToDelete(null)}
                handleDeleteGroup={handleDeleteField}
                loading={isDeleting}
                title={`Delete Field Component: ${fieldNameToDelete}`}
                description={`This action cannot be undone. This will permanently delete "${fieldNameToDelete}" and remove it from any containers or layouts that use it.`}
                deleteButtonText="Delete Field"
            />
        </StructuredSectionCard>
    );
}