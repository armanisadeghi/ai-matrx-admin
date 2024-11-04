/*
'use client';

import React, {useCallback, useMemo} from "react";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {createEntitySelectors} from "@/lib/redux/entity/entitySelectors";
import {createEntityActions} from "@/lib/redux/entity/entityActionCreator";
import {PlaceholdersVanishingSearchInput} from "@/components/matrx/search-input/PlaceholdersVanishingSearchInput";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import MatrxTooltip from "@/components/matrx/MatrxTooltip";
import {Button} from "@/components/ui/button";
import {Plus, Settings} from "lucide-react";
import {EntityKeys} from "@/types/entityTypes";
import {useToast} from "@/components/ui/use-toast";
import {cn} from "@/lib/utils";

// Props interface with all props optional for override capability
interface TableTopOptionsProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSearchChange?: (searchValue: string) => void;
    onPageSizeChange?: (size: number) => void;
    onAddNew?: () => void;
    onColumnSettingsChange?: (open: boolean) => void;
    disableAdd?: boolean;
    addButtonTooltip?: string;
    className?: string;
}

export function useTableTopOptions<TEntity extends EntityKeys>(entityKey: TEntity) {
    const dispatch = useAppDispatch();
    const {toast} = useToast();

    // Get entity selectors and actions
    const entitySelectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const entityActions = useMemo(() => createEntityActions(entityKey), [entityKey]);

    // Select necessary state
    const pageSize = useAppSelector(entitySelectors.selectPageSize);
    const searchTerm = useAppSelector(entitySelectors.selectSearchTerm);
    const columnSettings = useAppSelector(entitySelectors.selectColumnSettings);
    const allFields = useAppSelector(entitySelectors.selectSchema);
    const permissions = useAppSelector(state => state.auth.permissions); // Assuming you have auth state

    // Handlers
    const handleSearch = useCallback((value: string) => {
        dispatch(entityActions.setSearchTerm(value));
        dispatch(entityActions.fetchPaginatedRequest({
            page: 1, // Reset to first page on search
            pageSize,
            searchTerm: value
        }));
    }, [dispatch, entityActions, pageSize]);

    const handlePageSizeChange = useCallback((size: number) => {
        dispatch(entityActions.setPageSize(size));
        dispatch(entityActions.fetchPaginatedRequest({
            page: 1, // Reset to first page on size change
            pageSize: size,
            searchTerm
        }));
    }, [dispatch, entityActions, searchTerm]);

    const handleAddNew = useCallback(async () => {
        try {
            // Create empty entity with default values from schema
            const defaultValues = allFields.reduce((acc, field) => ({
                ...acc,
                [field.name]: field.defaultValue
            }), {});

            dispatch(entityActions.setSelectedItem(null)); // Clear selected item
            dispatch(entityActions.setEditMode(true));
            dispatch(entityActions.setFormData(defaultValues));

            // Additional setup for new item
            dispatch(entityActions.prepareNewItem());

        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to prepare new item: ${(error as Error).message}`,
                variant: "destructive"
            });
        }
    }, [dispatch, entityActions, allFields, toast]);

    const handleColumnSettingsToggle = useCallback((open: boolean) => {
        dispatch(entityActions.setColumnSettingsOpen(open));
    }, [dispatch, entityActions]);

    return {
        pageSize,
        searchTerm,
        columnSettings,
        handleSearch,
        handlePageSizeChange,
        handleAddNew,
        handleColumnSettingsToggle,
        canAdd: permissions?.includes(`${entityKey}:create`)
    };
}

const TableTopOptions = <TEntity extends EntityKeys>(
    {
        entityKey,
        onSearchChange,
        onPageSizeChange,
        onAddNew,
        onColumnSettingsChange,
        disableAdd,
        addButtonTooltip = "Add a new item",
        className
    }: TableTopOptionsProps<TEntity>) => {
    // Get default functionality
    const {
        pageSize,
        searchTerm,
        columnSettings,
        handleSearch,
        handlePageSizeChange,
        handleAddNew,
        handleColumnSettingsToggle,
        canAdd
    } = useTableTopOptions(entityKey);

    // Select schema info for search fields
    const entitySelectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const searchableFields = useAppSelector(entitySelectors.selectSearchableFields);

    // Use provided handlers or defaults
    const onSearch = onSearchChange || handleSearch;
    const onPageSize = onPageSizeChange || handlePageSizeChange;
    const onAdd = onAddNew || handleAddNew;
    const onColumnSettings = onColumnSettingsChange || handleColumnSettingsToggle;

    return (
        <div className={cn("flex justify-between items-center", className)}>
            <PlaceholdersVanishingSearchInput
                columnNames={searchableFields}
                value={searchTerm}
                onSearchChange={onSearch}
                className="w-1/3"
            />

            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Rows:</span>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => onPageSize(Number(value))}
                    >
                        <SelectTrigger className="w-[100px] bg-card text-card-foreground border-input">
                            <SelectValue placeholder="Rows per page"/>
                        </SelectTrigger>
                        <SelectContent>
                            {[5, 10, 25, 50, 100].map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex space-x-2">
                    <MatrxTooltip content={addButtonTooltip} placement="bottom" offset={10}>
                        <Button
                            onClick={onAdd}
                            disabled={disableAdd || !canAdd}
                            className={cn(
                                "bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105",
                                (disableAdd || !canAdd) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Plus className="mr-2 h-4 w-4"/> Add New
                        </Button>
                    </MatrxTooltip>

                    <MatrxTooltip content="Column settings" placement="bottom" offset={10}>
                        <Button
                            onClick={() => onColumnSettings(!columnSettings.isOpen)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105"
                        >
                            <Settings className="mr-2 h-4 w-4"/>
                            Columns
                        </Button>
                    </MatrxTooltip>
                </div>
            </div>
        </div>
    );
};

export default TableTopOptions;
*/
