'use client';

import React from "react";
import {
    Cell as TanStackCell,
} from '@tanstack/react-table';
import {TableCell} from "@/components/ui/table";
import {motion} from "framer-motion";
import {truncateText} from "../utils";
import MatrixTableTooltip from "../MatrixTableTooltip";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {
    EntityCommandGroup,
    EntityCommandName,
    EntityActionCell, EntityCommandContext
} from "@/components/matrx/MatrxCommands/EntityCommand";

interface MatrxTableCellProps<TEntity extends EntityKeys> {
    cell: TanStackCell<EntityData<TEntity>, unknown>;
    rowData: EntityData<TEntity>;
    entityKey: TEntity;
    index: number;
    truncateAt: number;

    commands?: {
        [key in EntityCommandName]?: boolean | {
        useCallback?: boolean;
        setActiveOnClick?: boolean;
        hidden?: boolean;
    };
    };
    customCommands?: Record<string, React.ComponentType<any>>;

    onCommandExecute?: (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => Promise<void>;
    onSetActiveItem?: (index: number) => void;
}

const MatrxTableCell = <TEntity extends EntityKeys>(
    {
        cell,
        rowData,
        entityKey,
        index,
        commands,
        customCommands,
        onCommandExecute,
        onSetActiveItem,
        truncateAt
    }: MatrxTableCellProps<TEntity>) => {
    if (cell.column.id === 'actions') {
        return (
            <EntityActionCell
                entityKey={entityKey}
                data={rowData}
                index={index}
                commands={commands}
                customCommands={customCommands}
                onCommandExecute={onCommandExecute}
                onSetActiveItem={onSetActiveItem}
                className="h-full"
            />
        );
    }

    const value = cell.getValue();
    const stringValue = String(value);
    const cellContent = truncateText(stringValue, truncateAt);
    const isTextTruncated = stringValue.length > truncateAt;

    return (
        <TableCell className="text-card-foreground">
            {isTextTruncated ? (
                <MatrixTableTooltip content={stringValue} side="top">
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
            ) : (
                 <motion.div
                     initial={false}
                     animate={{
                         scale: 1,
                         transition: {type: "spring", stiffness: 300, damping: 10},
                     }}
                 >
                     {cellContent}
                 </motion.div>
             )}
        </TableCell>
    );
};

export default MatrxTableCell;
