import React from 'react';
import {TableHeader, TableRow, TableHead} from "@/components/ui/table";
import { motion } from "motion/react";
import {ArrowUpDown, ChevronUp, ChevronDown} from "lucide-react";
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {TableHeaderProps} from "@/types/entityTableTypes";
import { flexRender } from '@tanstack/react-table';

const MatrxTableHeader = <TEntity extends EntityKeys>(
    {
        headerGroups
    }: TableHeaderProps<TEntity>) => {
    return (
        <TableHeader>
            {headerGroups.map((headerGroup) => (
                <TableRow
                    key={headerGroup.id}
                    className="bg-neutral-100 dark:bg-neutral-700"
                >
                    {headerGroup.headers.map((header) => {
                        const isSortable = header.column.getCanSort();

                        return (
                            <TableHead
                                key={header.id}
                                className="font-bold text-muted-foreground p-2 truncate"
                                style={{
                                    cursor: isSortable ? 'pointer' : 'default',
                                    userSelect: 'none'
                                }}
                                onClick={header.column.getToggleSortingHandler()}
                            >
                                <motion.div
                                    className="flex items-center justify-between"
                                    whileHover={isSortable ? {scale: 1.05} : undefined}
                                    whileTap={isSortable ? {scale: 0.95} : undefined}
                                >
                                    {header.isPlaceholder
                                     ? null
                                        : flexRender(header.column.columnDef.header, header.getContext())}

                                    {isSortable && (
                                        <span className="ml-2">
                                            {header.column.getIsSorted() === 'asc' ? (
                                                <ChevronUp className="h-4 w-4"/>
                                            ) : header.column.getIsSorted() === 'desc' ? (
                                                <ChevronDown className="h-4 w-4"/>
                                            ) : (
                                                    <ArrowUpDown className="h-4 w-4"/>
                                                )}
                                        </span>
                                    )}
                                </motion.div>
                            </TableHead>
                        );
                    })}
                </TableRow>
            ))}
        </TableHeader>
    );
};

export default MatrxTableHeader;
