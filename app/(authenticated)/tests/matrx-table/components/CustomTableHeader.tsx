// app/(authenticated)/tests/matrx-table/components/CustomTableHeader.tsx
import {UseSortByColumnProps} from "react-table";
import React from "react";
import {TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {motion} from "framer-motion";
import {ArrowUpDown} from "lucide-react";
import {TableHeaderProps, TableData} from "./table.types";

const CustomTableHeader: React.FC<TableHeaderProps> = ({headerGroups}) => {
    return (
        <TableHeader>
            {headerGroups.map((headerGroup) => (
                <TableRow
                    key={headerGroup.getHeaderGroupProps().key}
                    {...headerGroup.getHeaderGroupProps()}
                    className="bg-neutral-100 dark:bg-neutral-700 mr-8"
                >
                    {headerGroup.headers.map((column) => (
                        <TableHead
                            key={column.getHeaderProps().key}
                            {...column.getHeaderProps((column as unknown as UseSortByColumnProps<TableData>).getSortByToggleProps())}
                            className="font-bold cursor-pointer text-muted-foreground"
                        >
                            <motion.div
                                className="flex items-center justify-between"
                                whileHover={{scale: 1.05}}
                                whileTap={{scale: 0.95}}
                            >
                                {column.render('Header')}
                                <ArrowUpDown className="ml-2 h-4 w-4"/>
                            </motion.div>
                        </TableHead>
                    ))}
                </TableRow>
            ))}
        </TableHeader>
    );
};


export default CustomTableHeader;
