import {UseSortByColumnProps} from "react-table";
import React from "react";
import {TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {motion} from "framer-motion";
import {ArrowUpDown} from "lucide-react";
import {TableHeaderProps, TableData} from "@/types/tableTypes";

const CustomTableHeader: React.FC<TableHeaderProps> = ({headerGroups}) => {
    return (
        <TableHeader>
            {headerGroups.map((headerGroup, headerGroupIndex) => {
                const headerGroupProps = headerGroup.getHeaderGroupProps();
                const { key: headerGroupKey, ...restHeaderGroupProps } = headerGroupProps;

                return (
                    <TableRow
                        key={headerGroupKey || `headerGroup-${headerGroupIndex}`}
                        {...restHeaderGroupProps}
                        className="bg-neutral-100 dark:bg-neutral-700 mr-8"
                    >
                        {headerGroup.headers.map((column, columnIndex) => {
                            const columnProps = column.getHeaderProps(
                                (column as unknown as UseSortByColumnProps<TableData>).getSortByToggleProps()
                            );
                            const { key: columnKey, ...restColumnProps } = columnProps;

                            return (
                                <TableHead
                                    key={columnKey || `column-${headerGroupIndex}-${columnIndex}`}
                                    {...restColumnProps}
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
                            );
                        })}
                    </TableRow>
                );
            })}
        </TableHeader>
    );
};

export default CustomTableHeader;
