"use client";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { useRouter } from "next/navigation";
import { selectAllFields, selectFieldLoading } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { deleteFieldThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { Eye, Pencil, TextCursorInput, Trash2 } from "lucide-react";
import { FieldBuilder } from "@/lib/redux/app-builder/types";
import { getComponentIcon, getComponentTypeName } from "@/features/applet/builder/modules/field-builder/field-constants";
import GenericDataTable, { GenericTableHeader, ColumnConfig, ActionConfig } from "@/components/generic-table";

interface FieldListTableProps {
    onFieldView?: (id: string) => void;
    onFieldEdit?: (id: string) => void;
    onFieldDelete?: (id: string) => void;
    onFieldSelect?: (id: string) => void;
    onFieldCreate?: () => void;
}

export default function FieldListTable({ 
    onFieldView, 
    onFieldEdit, 
    onFieldDelete, 
    onFieldSelect, 
    onFieldCreate 
}: FieldListTableProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    
    // Get fields from Redux
    const fields = useAppSelector(selectAllFields);
    const isLoading = useAppSelector(selectFieldLoading);
    
    // Local state for search/filter
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredFields, setFilteredFields] = useState<FieldBuilder[]>([]);
    
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
    const handleSortClick = (field: string) => {
        if (sortBy === field as SortField) {
            // Toggle direction if clicking the same field
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new field and default to ascending
            setSortBy(field as SortField);
            setSortDirection("asc");
        }
    };
    
    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
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
    
    // Handle delete field
    const handleDeleteField = async (field: FieldBuilder) => {
        try {
            if (onFieldDelete) {
                onFieldDelete(field.id);
            } else {
                await dispatch(deleteFieldThunk(field.id)).unwrap();
            }
        } catch (error) {
            console.error("Failed to delete field:", error);
        }
    };
    
    // Define columns
    const columns: ColumnConfig<FieldBuilder>[] = [
        {
            key: "label",
            header: "Label",
            width: "w-[200px]",
            sortable: true,
            render: (field) => (
                <div className="flex items-center">
                    {field.label ? (
                        <span>{field.label}</span>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">Unnamed Field</span>
                    )}
                </div>
            )
        },
        {
            key: "component",
            header: "Component Type",
            width: "w-[200px]",
            sortable: true,
            render: (field) => getComponentTypeName(field.component)
        },
        {
            key: "description",
            header: "Description",
            sortable: true,
            className: "hidden md:table-cell",
            render: (field) => (
                field.description ? (
                    <span className="line-clamp-1 max-w-xs">{field.description}</span>
                ) : (
                    <span className="text-gray-500 dark:text-gray-400">No description</span>
                )
            )
        },
        {
            key: "required",
            header: "Required",
            width: "w-[100px]",
            className: "text-center",
            sortable: true,
            render: (field) => (
                field.required ? (
                    <div className="flex justify-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            Required
                        </span>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
                            Optional
                        </span>
                    </div>
                )
            )
        }
    ];
    
    // Define actions
    const actions: ActionConfig<FieldBuilder>[] = [
        {
            icon: <Eye className="h-4 w-4" />,
            onClick: (field) => {
                handleViewField(field.id);
            },
            badgeStyle: !!onFieldSelect,
            badgeVariant: "outline",
            badgeClassName: "bg-blue-50 dark:bg-blue-900/20 border-blue-500",
            label: "Select"
        },
        {
            icon: <Pencil className="h-4 w-4" />,
            onClick: (field) => {
                handleEditField(field.id);
            },
            showCondition: () => !!onFieldEdit
        },
        {
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (field) => {
                handleDeleteField(field);
            },
            className: "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
            requiresConfirmation: true,
            confirmationProps: {
                getTitle: (field) => `Delete Field Component: ${field.label || "Unnamed Field"}`,
                getDescription: (field) => `This action cannot be undone. This will permanently delete "${field.label || "Unnamed Field"}" and remove it from any containers or layouts that use it.`,
                confirmButtonText: "Delete Field"
            }
        }
    ];

    return (
        <GenericDataTable
            items={fields}
            filteredItems={filteredFields}
            paginatedItems={paginatedFields}
            isLoading={isLoading}
            columns={columns}
            idField="id"
            iconField={{
                key: "iconName",
                renderIcon: (field) => {
                    return getComponentIcon(field.component);
                }
            }}
            labelField="label"
            statusBadge={{
                key: "status",
                isDirtyKey: "isDirty",
                isLocalKey: "isLocal",
                isPublicKey: "isPublic"
            }}
            emptyState={{
                icon: <TextCursorInput className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />,
                title: "No Field Components Found",
                description: "You haven't created any field components yet. Field components are reusable form elements that can be used in your applets.",
                buttonText: "Create First Field",
                onButtonClick: handleCreateField
            }}
            title="All Field Components"
            headerActions={[
                <GenericTableHeader
                    key="table-header"
                    entityName="Field"
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onCreateItem={handleCreateField}
                />
            ]}
            onRowClick={(field) => handleViewField(field.id)}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortClick}
            actions={actions}
            totalItems={filteredFields.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
        />
    );
}
