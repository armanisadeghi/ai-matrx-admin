'use client'

import React, {useState, useMemo} from 'react';
import {useTable, useSortBy, useGlobalFilter, usePagination, Column} from 'react-table';
import {motion, AnimatePresence} from 'framer-motion';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {ArrowUpDown, ChevronLeft, ChevronRight, Plus, Edit, Trash, Settings} from 'lucide-react';
import MatrxTooltip from '@/components/matrx/MatrxTooltip';
import DialogForm from "./DialogForm";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import MatrxCheckbox from "@/components/matrx/MatrxCheckbox";
import {PlaceholdersVanishingSearchInput} from "@/components/matrx/search-input/PlaceholdersVanishingSearchInput";


export interface TableData {
    id: number | string;

    [key: string]: any;
}

interface ModernTableProps {
    columns: Column<TableData>[];
    data: TableData[];
    onAdd: (newItem: Omit<TableData, 'id'>) => void;
    onEdit: (id: number | string, updatedItem: Omit<TableData, 'id'>) => void;
    onDelete: (item: TableData) => void;
}

const ModernTable: React.FC<ModernTableProps> = ({columns, data, onAdd, onEdit, onDelete}) => {
    const [visibleColumns, setVisibleColumns] = useState(columns.map(col => col.accessor as string));
    const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

    const visibleColumnsData = useMemo(
        () => columns.filter(column => visibleColumns.includes(column.accessor as string)),
        [columns, visibleColumns]
    );

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        page,
        prepareRow,
        state,
        setGlobalFilter,
        nextPage,
        previousPage,
        canNextPage,
        canPreviousPage,
        pageCount,
        gotoPage,
        setPageSize,
    } = useTable(
        {
            columns: visibleColumnsData,
            data,
            initialState: {pageSize: 10},
        },
        useGlobalFilter,
        useSortBy,
        usePagination
    );

    const {globalFilter, pageIndex, pageSize} = state;
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingRow, setEditingRow] = useState<TableData | null>(null);

    const pageNumbers = [];
    const totalPages = pageCount;
    const currentPage = pageIndex + 1;

    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        if (currentPage <= 3) {
            pageNumbers.push(1, 2, 3, 4, 5);
        } else if (currentPage >= totalPages - 2) {
            pageNumbers.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pageNumbers.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
        }
    }

    const handleAdd = () => {
        setModalMode('add');
        setEditingRow(null);
        setModalOpen(true);
    };

    const handleEdit = (row: TableData) => {
        setModalMode('edit');
        setEditingRow(row);
        setModalOpen(true);
    };

    const handleDelete = (row: TableData) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            onDelete(row);
        }
    };

    const handleModalSubmit = (formData: Record<string, string>) => {
        if (modalMode === 'add') {
            onAdd(formData);
        } else if (editingRow) {
            onEdit(editingRow.id, formData);
        }
        setModalOpen(false);
    };

    const truncateText = (text: unknown, maxLength: number = 100): string => {
        if (typeof text !== 'string') {
            return String(text);
        }
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };


    const handleSearchChange = (value: string) => {
        setGlobalFilter(value);
    };

    const columnNames = useMemo(() => columns.map((col) => col.Header as string), [columns]);


    return (
        <div className="p-4 space-y-4">
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
                                {[5, 10, 25, 50, 100].map(size => (
                                    <SelectItem key={size} value={size.toString()}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex space-x-2">
                        <MatrxTooltip content="Add a new item" placement="bottom" offset={10}>
                            <Button
                                onClick={handleAdd}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105"
                            >
                                <Plus className="mr-2 h-4 w-4"/> Add New
                            </Button>
                        </MatrxTooltip>
                        <MatrxTooltip content="Column settings" placement="bottom" offset={10}>
                            <Button
                                onClick={() => setColumnSettingsOpen(true)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105"
                            >
                                <Settings className="mr-2 h-4 w-4"/>
                                Columns
                            </Button>
                        </MatrxTooltip>
                    </div>
                </div>
            </div>
            <div className="relative overflow-hidden shadow-md sm:rounded-lg">
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden">
                            <Table {...getTableProps()} className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <TableHeader>
                                    {headerGroups.map(headerGroup => (
                                        <TableRow key={headerGroup.id} {...headerGroup.getHeaderGroupProps()}
                                                  className="bg-neutral-100 dark:bg-neutral-700">
                                            {headerGroup.headers.map(column => (
                                                <TableHead
                                                    key={column.id}
                                                    {...column.getHeaderProps(column.getSortByToggleProps())}
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
                                            <TableHead className="text-muted-foreground">Actions</TableHead>
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody {...getTableBodyProps()}>
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
                                                            type: "spring",
                                                            stiffness: 300,
                                                            damping: 20,
                                                            delay: i * 0.05
                                                        }
                                                    }}
                                                    exit={{opacity: 0, y: 10}}
                                                    whileHover={{
                                                        scale: 1.02,
                                                        transition: {duration: 0.2}
                                                    }}
                                                    className="bg-card hover:bg-accent/50 cursor-pointer"
                                                    onClick={() => handleEdit(row.original)}
                                                >
                                                    {row.cells.map(cell => (
                                                        <TableCell key={cell.id} {...cell.getCellProps()}
                                                                   className="text-card-foreground">
                                                            <motion.div
                                                                initial={false}
                                                                animate={{
                                                                    scale: 1,
                                                                    transition: {type: "spring", stiffness: 300, damping: 10}
                                                                }}
                                                            >
                                                                {truncateText(cell.value)}
                                                            </motion.div>
                                                        </TableCell>
                                                    ))}
                                                    <TableCell>
                                                        <div className="flex space-x-2">
                                                            <MatrxTooltip content="Edit this item" placement="left">
                                                                <Button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEdit(row.original);
                                                                    }}
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                                                                >
                                                                    <Edit className="h-4 w-4"/>
                                                                </Button>
                                                            </MatrxTooltip>
                                                            <MatrxTooltip content="Delete this item" placement="left">
                                                                <Button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(row.original);
                                                                    }}
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 hover:scale-105"
                                                                >
                                                                    <Trash className="h-4 w-4"/>
                                                                </Button>
                                                            </MatrxTooltip>
                                                        </div>
                                                    </TableCell>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center mt-4">
                <MatrxTooltip content="Go to previous page">
                    <Button
                        onClick={() => previousPage()}
                        disabled={!canPreviousPage}
                        variant="outline"
                        className="bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-300 hover:scale-105"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4"/> Previous
                    </Button>
                </MatrxTooltip>

                <div className="flex space-x-2">
                    {pageNumbers.map((number) => (
                        <motion.button
                            key={number}
                            onClick={() => gotoPage(number - 1)}
                            className={`px-3 py-1 rounded ${currentPage === number ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'}`}
                            whileHover={{scale: 1.1, rotateY: 15}}
                            whileTap={{scale: 0.9}}
                            style={{transformStyle: "preserve-3d"}}
                        >
                            {number}
                        </motion.button>
                    ))}
                </div>
                <MatrxTooltip content="Go to next page" placement="left">
                    <Button
                        onClick={() => nextPage()}
                        disabled={!canNextPage}
                        variant="outline"
                        className="bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-300 hover:scale-105"
                    >
                        Next <ChevronRight className="ml-2 h-4 w-4"/>
                    </Button>
                </MatrxTooltip>
            </div>
            <DialogForm
                open={modalOpen}
                onOpenChange={setModalOpen}
                modalMode={modalMode}
                columns={columns}
                editingRow={editingRow}
                onSubmit={handleModalSubmit}
            />
            <ColumnSettingsModal
                open={columnSettingsOpen}
                onOpenChange={setColumnSettingsOpen}
                columns={columns}
                visibleColumns={visibleColumns}
                setVisibleColumns={setVisibleColumns}
            />
        </div>
    );
};

export default ModernTable;


interface ColumnSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: Column<TableData>[];
    visibleColumns: string[];
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
}


const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = (
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
                <div className="grid gap-4 py-4">
                    {columns.map(column => (
                        <MatrxCheckbox
                            key={column.id}
                            id={column.id}
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
