"use client";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { useRouter } from "next/navigation";
import { selectAllApplets, selectAppletLoading } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { deleteAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { Eye, Pencil, AppWindow, Box, Trash2 } from "lucide-react";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import { ICON_OPTIONS } from "@/features/applet/layouts/helpers/StyledComponents";
import GenericDataTable, {GenericTableHeader, ColumnConfig, ActionConfig } from "@/components/generic-table";

interface AppletListTableProps {
    onAppletView?: (id: string) => void;
    onAppletEdit?: (id: string) => void;
    onAppletDelete?: (id: string) => void;
    onAppletSelect?: (id: string) => void;
    onAppletCreate?: () => void;
}

export default function AppletListTable({
    onAppletView,
    onAppletEdit,
    onAppletDelete,
    onAppletSelect,
    onAppletCreate
}: AppletListTableProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    
    // Get applets from Redux
    const applets = useAppSelector(selectAllApplets);
    const isLoading = useAppSelector(selectAppletLoading);
    
    // Local state for search/filter
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredApplets, setFilteredApplets] = useState<AppletBuilder[]>([]);
    
    // Sorting state
    type SortField = "name" | "slug" | "description" | "containers";
    const [sortBy, setSortBy] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [paginatedApplets, setPaginatedApplets] = useState<AppletBuilder[]>([]);
    
    // Apply search/filter and sorting whenever applets, search term, or sort params change
    useEffect(() => {
        let filtered = applets;
        
        // Apply search filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(
                (applet) =>
                    applet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    applet.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    applet.slug?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case "name":
                    comparison = (a.name || "").localeCompare(b.name || "");
                    break;
                case "slug":
                    comparison = (a.slug || "").localeCompare(b.slug || "");
                    break;
                case "description":
                    comparison = (a.description || "").localeCompare(b.description || "");
                    break;
                case "containers":
                    const aLength = a.containers?.length || 0;
                    const bLength = b.containers?.length || 0;
                    comparison = aLength - bLength;
                    break;
                default:
                    comparison = (a.name || "").localeCompare(b.name || "");
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });
        
        setFilteredApplets(sorted);
        
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [applets, searchTerm, sortBy, sortDirection]);
    
    // Apply pagination
    useEffect(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        setPaginatedApplets(filteredApplets.slice(startIndex, endIndex));
    }, [filteredApplets, currentPage, itemsPerPage]);
    
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
    const handleViewApplet = (id: string) => {
        onAppletView?.(id);
        if (onAppletSelect) {
            onAppletSelect(id);
        }
    };
    
    const handleEditApplet = (id: string) => {
        onAppletEdit?.(id);
    };
    
    const handleCreateApplet = () => {
        if (onAppletCreate) {
            onAppletCreate();
        } else {
            router.push("/apps/app-builder/applets/create");
        }
    };
    
    // Handle delete applet
    const handleDeleteApplet = async (applet: AppletBuilder) => {
        try {
            if (onAppletDelete) {
                onAppletDelete(applet.id);
            } else {
                await dispatch(deleteAppletThunk(applet.id)).unwrap();
            }
        } catch (error) {
            console.error("Failed to delete applet:", error);
        }
    };
    
    // Render icon helper function
    const renderIcon = (iconName: string | undefined) => {
        if (!iconName) return <AppWindow className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
        
        const IconComponent = ICON_OPTIONS[iconName];
        if (!IconComponent) return <AppWindow className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
        
        return <IconComponent className="h-5 w-5 text-gray-700 dark:text-gray-300" />;
    };
    
    // Define columns
    const columns: ColumnConfig<AppletBuilder>[] = [
        {
            key: "name",
            header: "Name",
            width: "w-[200px]",
            sortable: true,
            render: (applet) => (
                <div className="flex items-center">
                    {applet.name ? (
                        <span>{applet.name}</span>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">Unnamed Applet</span>
                    )}
                </div>
            )
        },
        {
            key: "slug",
            header: "Slug",
            width: "w-[200px]",
            sortable: true,
            render: (applet) => (
                applet.slug ? (
                    <span>{applet.slug}</span>
                ) : (
                    <span className="text-gray-500 dark:text-gray-400">No slug</span>
                )
            )
        },
        {
            key: "description",
            header: "Description",
            sortable: true,
            className: "hidden md:table-cell",
            render: (applet) => (
                applet.description ? (
                    <span className="line-clamp-1 max-w-xs">{applet.description}</span>
                ) : (
                    <span className="text-gray-500 dark:text-gray-400">No description</span>
                )
            )
        },
        {
            key: "containers",
            header: "Containers",
            width: "w-[100px]",
            className: "text-center",
            sortable: true,
            render: (applet) => (
                <div className="flex justify-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {applet.containers?.length || 0}
                    </span>
                </div>
            )
        }
    ];
    
    // Define actions
    const actions: ActionConfig<AppletBuilder>[] = [
        {
            icon: <Eye className="h-4 w-4" />,
            onClick: (applet) => {
                handleViewApplet(applet.id);
            },
            badgeStyle: !!onAppletSelect,
            badgeVariant: "outline",
            badgeClassName: "bg-blue-50 dark:bg-blue-900/20 border-blue-500",
            label: "Select"
        },
        {
            icon: <Pencil className="h-4 w-4" />,
            onClick: (applet) => {
                handleEditApplet(applet.id);
            },
            showCondition: () => !!onAppletEdit
        },
        {
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (applet) => {
                handleDeleteApplet(applet);
            },
            className: "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
            showCondition: () => !!onAppletDelete,
            requiresConfirmation: true,
            confirmationProps: {
                getTitle: (applet) => `Delete Applet: ${applet.name || "Unnamed Applet"}`,
                getDescription: (applet) => `This action cannot be undone. This will permanently delete "${applet.name || "Unnamed Applet"}" and remove it from any applications that use it.`,
                confirmButtonText: "Delete Applet"
            }
        }
    ];

    return (
        <GenericDataTable
            items={applets}
            filteredItems={filteredApplets}
            paginatedItems={paginatedApplets}
            isLoading={isLoading}
            columns={columns}
            idField="id"
            iconField={{
                key: "appletIcon",
                renderIcon: (applet) => renderIcon(applet.appletIcon)
            }}
            labelField="name"
            statusBadge={{
                key: "status",
                isDirtyKey: "isDirty",
                isLocalKey: "isLocal",
                isPublicKey: "isPublic"
            }}
            emptyState={{
                icon: <AppWindow className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />,
                title: "No Applets Found",
                description: "You haven't created any applets yet. Applets are interactive components that can be added to your apps.",
                buttonText: "Create First Applet",
                onButtonClick: handleCreateApplet
            }}
            title="All Applets"
            headerActions={[
                <GenericTableHeader
                    key="table-header"
                    entityName="Applet"
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onCreateItem={handleCreateApplet}
                />
            ]}
            onRowClick={(applet) => handleViewApplet(applet.id)}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortClick}
            actions={actions}
            totalItems={filteredApplets.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
        />
    );
}