import React from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import MatrxCheckbox from "@/components/matrx/MatrxCheckbox";
import {MatrxColumnSettingsProps} from "@/_armani/old-types/tableTypes";

const MatrxColumnSettings: React.FC<MatrxColumnSettingsProps> = (
    {
        open,
        onOpenChange,
        columns,
        visibleColumns,
        setVisibleColumns
    }) => {
    const handleColumnToggle = (columnId: string, isChecked: boolean) => {
        setVisibleColumns(prev =>
            isChecked
                ? [...prev, columnId]
                : prev.filter(id => id !== columnId)
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Column Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 ">
                    {columns.map(column => (
                        <MatrxCheckbox
                            key={column.id}
                            id={column.id as string}
                            lineThrough={false}
                            checked={visibleColumns.includes(column.accessor as string)}
                            onChange={(isChecked) => handleColumnToggle(column.accessor as string, isChecked)}
                        >
                            <MatrxCheckbox.Indicator/>
                            <MatrxCheckbox.Label>
                                {column.Header as string}
                            </MatrxCheckbox.Label>
                        </MatrxCheckbox>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MatrxColumnSettings;
