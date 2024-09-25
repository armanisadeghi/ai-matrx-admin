import {Row} from "react-table";
import React from "react";
import {TableBody} from "@/components/ui/table";
import {AnimatePresence, motion} from "framer-motion";
import CustomTableCell from "@/app/(authenticated)/tests/table-test/CustomTableCell";
import {TableData} from "@/app/(authenticated)/tests/table-test/ModernTable";
import {ActionDefinition} from "@/app/(authenticated)/tests/table-test/TableActionIcon";

interface CustomTableBodyProps {
    page: Row<TableData>[];
    prepareRow: (row: Row<TableData>) => void;
    truncateText: (text: unknown, maxLength?: number) => string;
    actions: ActionDefinition[];
    onAction: (actionName: string, rowData: TableData) => void;
    visibleColumns: string[];
}

const CustomTableBody: React.FC<CustomTableBodyProps> = (
    {
        page,
        prepareRow,
        truncateText,
        actions,
        onAction,
        visibleColumns
    }) => {
    return (
        <TableBody>
            <AnimatePresence>
                {page.map((row, i) => {
                    prepareRow(row);
                    return (
                        <motion.tr
                            key={row.id}
                            {...row.getRowProps()}
                            initial={{opacity: 0, y: -10}}
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: {
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 20,
                                    delay: i * 0.05,
                                },
                            }}
                            exit={{opacity: 0, y: 10}}
                            whileHover={{
                                scale: 1.02,
                                transition: {duration: 0.2},
                            }}
                            className="bg-card hover:bg-accent/50 cursor-pointer"
                            onClick={() => onAction('view', row.original)}
                        >
                            {row.cells.map((cell) => (
                                <CustomTableCell
                                    key={cell.getCellProps().key}
                                    cell={cell}
                                    truncateText={truncateText}
                                    actions={actions}
                                    rowData={row.original}
                                    onAction={onAction}
                                />
                            ))}
                        </motion.tr>
                    );
                })}
            </AnimatePresence>
        </TableBody>
    );
};
export default CustomTableBody;
