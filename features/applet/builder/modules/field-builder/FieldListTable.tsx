"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { useRouter } from "next/navigation";
import { selectAllFields, selectFieldLoading } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { deleteFieldThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { Button } from "@/components/ui/button";
import {
    Search,
    Eye,
    Pencil,
    TextCursorInput,
    Trash2,
    Calendar,
    ToggleLeft,
    Check,
    ListFilter,
    RadioTower,
    SlidersHorizontal,
    Type,
    SquareTerminal,
    FileUp,
    Hash,
    PanelBottomClose,
    SquareStack,
    GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FieldBuilder } from "@/lib/redux/app-builder/types";
import StructuredSectionCard from "@/components/official/StructuredSectionCard";
import { ICON_OPTIONS } from "@/features/applet/layouts/helpers/StyledComponents";
import { ConfirmationDialog } from "@/features/applet/builder/parts/ConfirmationDialog";

interface FieldListTableProps {
    onFieldView?: (id: string) => void;
    onFieldEdit?: (id: string) => void;
    onFieldDelete?: (id: string) => void;
    onFieldSelect?: (id: string) => void;
}

export default function FieldListTable({ onFieldView, onFieldEdit, onFieldDelete, onFieldSelect }: FieldListTableProps) {
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
    }, [fields, searchTerm, sortBy, sortDirection]);

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
            await dispatch(deleteFieldThunk(fieldToDelete)).unwrap();
            setFieldToDelete(null);
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
        const componentIconMap: Record<string, React.ReactNode> = {
            input: <TextCursorInput className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
            textarea: <PanelBottomClose className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
            select: <ListFilter className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
            multiselect: <GripVertical className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />,
            radio: <RadioTower className="h-5 w-5 text-pink-500 dark:text-pink-400" />,
            checkbox: <Check className="h-5 w-5 text-green-500 dark:text-green-400" />,
            slider: <SlidersHorizontal className="h-5 w-5 text-orange-500 dark:text-orange-400" />,
            number: <Hash className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />,
            date: <Calendar className="h-5 w-5 text-red-500 dark:text-red-400" />,
            switch: <ToggleLeft className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
            button: <SquareStack className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
            rangeSlider: <SlidersHorizontal className="h-5 w-5 text-teal-500 dark:text-teal-400" />,
            numberPicker: <Hash className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-400" />,
            jsonField: <SquareTerminal className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
            fileUpload: <FileUp className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
        };

        return componentIconMap[field.component] || <TextCursorInput className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    };

    // Get nice name for component type
    const getComponentTypeName = (componentType: string) => {
        const typeMap: Record<string, string> = {
            input: "Text Input",
            textarea: "Text Area",
            select: "Dropdown",
            multiselect: "Multi-Select",
            radio: "Radio Group",
            checkbox: "Checkbox",
            slider: "Slider",
            number: "Number",
            date: "Date Picker",
            switch: "Switch",
            button: "Button",
            rangeSlider: "Range Slider",
            numberPicker: "Number Picker",
            jsonField: "JSON Field",
            fileUpload: "File Upload",
        };

        return typeMap[componentType] || componentType;
    };

    const searchInput = (
        <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input placeholder="Search fields..." className="pl-8" value={searchTerm} onChange={handleSearchChange} />
        </div>
    );

    return (
        <StructuredSectionCard
            title="All Field Components"
            headerActions={[searchInput]}
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
                    <Button onClick={() => router.push("/apps/app-builder/fields/create")}>Create First Field</Button>
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
                                    className="w-[150px] cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
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
                            {filteredFields.map((field, index) => (
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
                                            <span>{field.label || "Unnamed Field"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getComponentTypeName(field.component)}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <span className="line-clamp-1 max-w-xs">{field.description || "No description"}</span>
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
