import React from 'react';
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { motion } from "framer-motion";
import { ArrowUpDown } from "lucide-react";
import {UseSortByColumnProps} from "react-table";
import {TableData} from "@/_armani/old-types/tableTypes";

const MatrxTableHeader = ({ headerGroups }) => {
    return (
        <TableHeader>
            {headerGroups.map((headerGroup) => (
                <TableRow
                    key={headerGroup.getHeaderGroupProps().key}
                    {...headerGroup.getHeaderGroupProps()}
                    className="bg-neutral-100 dark:bg-neutral-700"
                >
                    {headerGroup.headers.map((column) => (
                        <TableHead
                            key={column.getHeaderProps().key}
                            {...column.getHeaderProps((column as unknown as UseSortByColumnProps<TableData>).getSortByToggleProps())}
                            className="font-bold cursor-pointer text-muted-foreground p-2 truncate"
                        >
                            <motion.div
                                className="flex items-center justify-between"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {column.render('Header')}
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </motion.div>
                        </TableHead>
                    ))}
                </TableRow>
            ))}
        </TableHeader>
    );
};

export default MatrxTableHeader;
