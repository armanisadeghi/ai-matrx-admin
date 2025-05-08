"use client";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { useRouter } from "next/navigation";
import { selectAllApps, selectAppLoading } from "@/lib/redux/app-builder/selectors/appSelectors";
import { deleteAppThunk } from "@/lib/redux/app-builder/thunks/appBuilderThunks";
import { Eye, Pencil, AppWindow, Trash2 } from "lucide-react";
import { AppBuilder } from "@/lib/redux/app-builder/types";
import { ICON_OPTIONS } from "@/features/applet/layouts/helpers/StyledComponents";
import GenericDataTable, {GenericTableHeader, ColumnConfig, ActionConfig } from "@/components/generic-table";

interface AppListTableProps {
    onAppView?: (id: string) => void;
    onAppEdit?: (id: string) => void;
    onAppDelete?: (id: string) => void;
    onAppSelect?: (id: string) => void;
    onAppCreate?: () => void;
}

export default function AppListTable({
    onAppView,
    onAppEdit,
    onAppDelete,
    onAppSelect,
    onAppCreate
}: AppListTableProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    
    // Get apps from Redux
    const apps = useAppSelector(selectAllApps);
    const isLoading = useAppSelector(selectAppLoading);
    
    // Local state for search/filter
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredApps, setFilteredApps] = useState<AppBuilder[]>([]);
    
    // Sorting state
    type SortField = "name" | "slug" | "description" | "appletCount";
    const [sortBy, setSortBy] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [paginatedApps, setPaginatedApps] = useState<AppBuilder[]>([]);
    
    // Apply search/filter and sorting whenever apps, search term, or sort params change
    useEffect(() => {
        let filtered = apps;
        
        // Apply search filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(
                (app) =>
                    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    app.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    app.slug?.toLowerCase().includes(searchTerm.toLowerCase())
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
                case "appletCount":
                    const countA = a.appletIds?.length || 0;
                    const countB = b.appletIds?.length || 0;
                    comparison = countA - countB;
                    break;
                default:
                    comparison = (a.name || "").localeCompare(b.name || "");
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });
        
        setFilteredApps(sorted);
        
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [apps, searchTerm, sortBy, sortDirection]);
    
    // Apply pagination
    useEffect(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        setPaginatedApps(filteredApps.slice(startIndex, endIndex));
    }, [filteredApps, currentPage, itemsPerPage]);
    
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
    const handleViewApp = (id: string) => {
        onAppView?.(id);
        if (onAppSelect) {
            onAppSelect(id);
        }
    };
    
    const handleEditApp = (id: string) => {
        onAppEdit?.(id);
    };
    
    const handleCreateApp = () => {
        if (onAppCreate) {
            onAppCreate();
        } else {
            router.push("/apps/app-builder/apps/create");
        }
    };
    
    // Handle delete app
    const handleDeleteApp = async (app: AppBuilder) => {
        try {
            if (onAppDelete) {
                onAppDelete(app.id);
            } else {
                await dispatch(deleteAppThunk(app.id)).unwrap();
            }
        } catch (error) {
            console.error("Failed to delete app:", error);
        }
    };
    
    // Render icon helper function
    const renderAppIcon = (app: AppBuilder) => {
        if (!app.mainAppIcon) return <AppWindow className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
        
        const IconComponent = ICON_OPTIONS[app.mainAppIcon];
        if (!IconComponent) return <AppWindow className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
        
        return <IconComponent className="h-5 w-5 text-gray-700 dark:text-gray-300" />;
    };
    
    // Define columns
    const columns: ColumnConfig<AppBuilder>[] = [
        {
            key: "name",
            header: "Name",
            width: "w-[200px]",
            sortable: true,
            render: (app) => (
                <div className="flex items-center">
                    {app.name ? (
                        <span>{app.name}</span>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">Unnamed App</span>
                    )}
                </div>
            )
        },
        {
            key: "slug",
            header: "Slug",
            width: "w-[200px]",
            sortable: true,
            className: "hidden md:table-cell",
            render: (app) => (
                app.slug ? (
                    <span className="line-clamp-1 max-w-xs">{app.slug}</span>
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
            render: (app) => (
                app.description ? (
                    <span className="line-clamp-1 max-w-xs">{app.description}</span>
                ) : (
                    <span className="text-gray-500 dark:text-gray-400">No description</span>
                )
            )
        },
        {
            key: "appletCount",
            header: "Applets",
            width: "w-[100px]",
            className: "text-center",
            sortable: true,
            render: (app) => (
                <div className="flex justify-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {app.appletIds?.length || 0}
                    </span>
                </div>
            )
        }
    ];
    
    // Define actions
    const actions: ActionConfig<AppBuilder>[] = [
        {
            icon: <Eye className="h-4 w-4" />,
            onClick: (app) => {
                handleViewApp(app.id);
            },
            badgeStyle: !!onAppSelect,
            badgeVariant: "outline",
            badgeClassName: "bg-blue-50 dark:bg-blue-900/20 border-blue-500",
            label: "Select"
        },
        {
            icon: <Pencil className="h-4 w-4" />,
            onClick: (app) => {
                handleEditApp(app.id);
            },
            showCondition: () => !!onAppEdit
        },
        {
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (app) => {
                handleDeleteApp(app);
            },
            className: "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
            requiresConfirmation: true,
            confirmationProps: {
                getTitle: (app) => `Delete Application: ${app.name || "Unnamed App"}`,
                getDescription: (app) => `This action cannot be undone. This will permanently delete "${app.name || "Unnamed App"}" and all of its configuration. Any associated applets will be disconnected from this app.`,
                confirmButtonText: "Delete App"
            }
        }
    ];

    return (
        <GenericDataTable
            items={apps}
            filteredItems={filteredApps}
            paginatedItems={paginatedApps}
            isLoading={isLoading}
            columns={columns}
            idField="id"
            iconField={{
                key: "mainAppIcon",
                renderIcon: renderAppIcon
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
                title: "No Apps Found",
                description: "You haven't created any apps yet. Apps are complete applications that can be used by your users.",
                buttonText: "Create First App",
                onButtonClick: handleCreateApp
            }}
            title="All Apps"
            headerActions={[
                <GenericTableHeader
                    key="table-header"
                    entityName="App"
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onCreateItem={handleCreateApp}
                />
            ]}
            onRowClick={(app) => handleViewApp(app.id)}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortClick}
            actions={actions}
            totalItems={filteredApps.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
        />
    );
}