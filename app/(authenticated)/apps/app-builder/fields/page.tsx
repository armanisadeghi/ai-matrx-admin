"use client";
import React, { useState, useMemo } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectAllFields, selectFieldLoading } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { setActiveField } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { deleteFieldThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash, Copy, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { duplicateFieldComponent } from "@/lib/redux/app-builder/service/fieldComponentService";
import { Toaster } from "@/components/ui/toaster";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export default function FieldsListPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { toast } = useToast();

    // Get fields from Redux
    const fields = useAppSelector(selectAllFields);
    const isLoading = useAppSelector(selectFieldLoading);

    // State for sorting and filtering
    const [sortConfig, setSortConfig] = useState({ key: "label", direction: "asc" });
    const [filters, setFilters] = useState({
        label: "",
        component: "",
        description: "",
    });

    // Handle viewing a field
    const handleView = (id) => {
        dispatch(setActiveField(id));
        router.push(`/apps/app-builder/fields/${id}`);
    };

    // Handle editing a field
    const handleEdit = (id, event) => {
        event.stopPropagation();
        dispatch(setActiveField(id));
        router.push(`/apps/app-builder/fields/${id}/edit`);
    };

    // Handle deleting a field
    const handleDelete = async (id, event) => {
        event.stopPropagation();
        if (!confirm("Are you sure you want to delete this field component?")) {
            return;
        }

        try {
            await dispatch(deleteFieldThunk(id)).unwrap();
            toast({
                title: "Success",
                description: "Field component deleted successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete field component",
                variant: "destructive",
            });
        }
    };

    // Handle duplicating a field
    const handleDuplicate = async (id, event) => {
        event.stopPropagation();
        try {
            const duplicated = await duplicateFieldComponent(id);
            dispatch(setActiveField(duplicated.id));
            toast({
                title: "Success",
                description: "Field component duplicated successfully",
            });
            router.push(`/apps/app-builder/fields/${duplicated.id}`);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to duplicate field component",
                variant: "destructive",
            });
        }
    };

    // Sort handler
    const requestSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // Filter handler
    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    // Reset all filters
    const resetFilters = () => {
        setFilters({
            label: "",
            component: "",
            description: "",
        });
    };

    // Apply sorting and filtering
    const sortedAndFilteredFields = useMemo(() => {
        // First apply filters
        let filteredData = [...fields];

        if (filters.label) {
            filteredData = filteredData.filter((item) => item.label.toLowerCase().includes(filters.label.toLowerCase()));
        }

        if (filters.component) {
            filteredData = filteredData.filter((item) => item.component.toLowerCase().includes(filters.component.toLowerCase()));
        }

        if (filters.description) {
            filteredData = filteredData.filter((item) =>
                (item.description || "").toLowerCase().includes(filters.description.toLowerCase())
            );
        }

        // Then sort
        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key] || "";
            const bValue = b[sortConfig.key] || "";

            if (aValue < bValue) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });
    }, [fields, sortConfig, filters]);

    // Get sort icon for column
    const getSortIcon = (columnName) => {
        if (sortConfig.key !== columnName) {
            return <ChevronUp className="h-4 w-4 opacity-30" />;
        }

        return sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
    };

    if (isLoading && fields.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800">
                                <TableHead className="w-[30%]">
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => requestSort("label")}>
                                        <span>Name</span>
                                        <div className="flex items-center">
                                            {getSortIcon("label")}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="ml-1 h-6 w-6">
                                                        <Filter className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-56">
                                                    <div className="p-2">
                                                        <Input
                                                            placeholder="Filter by name"
                                                            value={filters.label}
                                                            onChange={(e) => handleFilterChange("label", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={resetFilters}>Clear all filters</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </TableHead>
                                <TableHead className="w-[20%]">
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => requestSort("component")}
                                    >
                                        <span>Type</span>
                                        <div className="flex items-center">
                                            {getSortIcon("component")}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="ml-1 h-6 w-6">
                                                        <Filter className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-56">
                                                    <div className="p-2">
                                                        <Input
                                                            placeholder="Filter by type"
                                                            value={filters.component}
                                                            onChange={(e) => handleFilterChange("component", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={resetFilters}>Clear all filters</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </TableHead>
                                <TableHead className="w-[30%]">
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => requestSort("description")}
                                    >
                                        <span>Description</span>
                                        <div className="flex items-center">
                                            {getSortIcon("description")}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="ml-1 h-6 w-6">
                                                        <Filter className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-56">
                                                    <div className="p-2">
                                                        <Input
                                                            placeholder="Filter by description"
                                                            value={filters.description}
                                                            onChange={(e) => handleFilterChange("description", e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={resetFilters}>Clear all filters</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </TableHead>
                                <TableHead className="w-[20%] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAndFilteredFields.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        No field components found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedAndFilteredFields.map((field) => (
                                    <TableRow
                                        key={field.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                        onClick={() => handleView(field.id)}
                                    >
                                        <TableCell className="font-medium">{field.label}</TableCell>
                                        <TableCell>{field.component}</TableCell>
                                        <TableCell className="text-gray-500 truncate max-w-[300px]">
                                            {field.description || "No description"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" onClick={() => handleView(field.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={(e) => handleEdit(field.id, e)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={(e) => handleDuplicate(field.id, e)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={(e) => handleDelete(field.id, e)}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Toaster />
        </div>
    );
}
