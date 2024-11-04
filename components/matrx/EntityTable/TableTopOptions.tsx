import React from "react";
import {PlaceholdersVanishingSearchInput} from "@/components/matrx/search-input/PlaceholdersVanishingSearchInput";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import MatrxTooltip from "@/components/matrx/MatrxTooltip";
import {Button} from "@/components/ui/button";
import {Plus, Settings} from "lucide-react";
import {cn} from "@/lib/utils";

interface TableTopOptionsProps {
    columnNames: string[];
    handleSearchChange: (searchValue: string) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    handleAdd: () => void;
    setColumnSettingsOpen: (open: boolean) => void;
    columnSettingsOpen: boolean;
    disableAdd?: boolean;
    addButtonTooltip?: string;
}

const TableTopOptions: React.FC<TableTopOptionsProps> = (
    {
        columnNames,
        handleSearchChange,
        pageSize,
        setPageSize,
        handleAdd,
        setColumnSettingsOpen,
        columnSettingsOpen,
        disableAdd = false,
        addButtonTooltip = "Add a new item"
    }) => {
    return (
        <div className="flex justify-between items-center">
            <PlaceholdersVanishingSearchInput
                columnNames={columnNames}
                onSearchChange={handleSearchChange}
                className="w-1/3"
            />
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Rows:</span>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => setPageSize(Number(value))}
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
                            onClick={handleAdd}
                            disabled={disableAdd}
                            className={cn(
                                "bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105",
                                disableAdd && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Plus className="mr-2 h-4 w-4"/> Add New
                        </Button>
                    </MatrxTooltip>
                    <MatrxTooltip content="Column settings" placement="bottom" offset={10}>
                        <Button
                            onClick={() => setColumnSettingsOpen(!columnSettingsOpen)}
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
