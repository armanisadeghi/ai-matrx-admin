/*
'use client';

import React from "react";

import {TableData} from "@/types/entityTableTypes";
import {TableCell} from "@/components/ui/table";
import { motion } from "motion/react";
import { TableActionIcon } from "../MatrixTableActions";
import { truncateText } from "../utils";
import MatrixTableTooltip from "../MatrixTableTooltip";
import {MatrxActionButton, standardActions} from "@/components/matrx/EntityTable/EnhancedAction/EntityMatrxActions";
import {useEntityTableActions} from "@/components/matrx/EntityTable/EnhancedAction/useEntityTableActions";
import {EntityKeys} from "@/types/entityTypes";


const MatrxTableCell: React.FC<{
    cell: Cell<TableData>;
    actions: string[];
    rowData: TableData;
    entityKey: EntityKeys;
    onAction: (actionName: string, rowData: TableData) => void;
    truncateAt: number;
}> = ({ cell, actions, rowData, entityKey, onAction, truncateAt }) => {
    const { handleAction } = useEntityTableActions(entityKey);

    if (cell.column.id === 'actions') {
        return (
            <TableCell className="text-card-foreground">
                <div className="flex items-center space-x-1">
                    {actions.map((actionName, index) => (
                        <MatrxActionButton
                            key={index}
                            action={standardActions[actionName]}
                            data={rowData}
                            entityKey={entityKey}
                            onAction={(action) => {
                                // Support both systems
                                handleAction(action, rowData);
                                onAction?.(action, rowData);
                            }}
                        />
                    ))}
                </div>
            </TableCell>
        );
    }

    const cellContent = truncateText(cell.value, truncateAt);

    const { key: cellKey, ...cellProps } = cell.getCellProps();

    return (
        <TableCell key={cellKey} {...cellProps} className="text-card-foreground">
            <MatrixTableTooltip content={cell.value} side="top">
                <motion.div
                    initial={false}
                    animate={{
                        scale: 1,
                        transition: {type: "spring", stiffness: 300, damping: 10},
                    }}
                >
                    {cellContent}
                </motion.div>
            </MatrixTableTooltip>
        </TableCell>
    );
};

export default MatrxTableCell;
*/
