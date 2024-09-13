// CustomTableCell.tsx
import React from 'react';
import {TableCell} from '@/components/ui/table';
import {motion} from 'framer-motion';
import {Cell} from "react-table";
import {TableData} from "@/app/tests/table-test/ModernTable";
import TableActionIcon, {ActionDefinition} from "@/app/tests/table-test/TableActionIcon";

interface CustomTableCellProps {
    cell: Cell<TableData>;
    truncateText: (text: unknown, maxLength?: number) => string;
    actions: ActionDefinition[];
    rowData: TableData;
    onAction: (actionName: string, rowData: TableData) => void;
}

const CustomTableCell: React.FC<CustomTableCellProps> = (
    {
        cell,
        truncateText,
        actions,
        rowData,
        onAction,
    }) => {
    const renderContent = () => (
        <motion.div
            initial={false}
            animate={{
                scale: 1,
                transition: {type: "spring", stiffness: 300, damping: 10},
            }}
        >
            {cell.render('Cell')}
        </motion.div>
    );

    const renderActions = (position: 'before' | 'after') => {
        const columnActions = (cell.column as any).actions || [];
        const relevantActions = actions.filter(action =>
            columnActions.some((colAction: any) =>
                colAction.name === action.name && colAction.position === position
            )
        );

        return relevantActions.map((action, index) => (
            <TableActionIcon
                key={index}
                action={action}
                data={rowData}
                onAction={onAction}
            />
        ));
    };

    return (
        <TableCell {...cell.getCellProps()} className="text-card-foreground">
            <div className="flex items-center space-x-1">
                {renderActions('before')}
                {renderContent()}
                {renderActions('after')}
            </div>
        </TableCell>
    );
};

export default CustomTableCell;
