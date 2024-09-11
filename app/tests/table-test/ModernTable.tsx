'use client'

import React, { useState } from 'react';
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUpDown, ChevronLeft, ChevronRight, Plus, Edit, Trash } from 'lucide-react';

const ModernTable = ({ columns, data, onAdd, onEdit, onDelete }) => {
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
            columns,
            data,
            initialState: { pageSize: 10 },
        },
        useGlobalFilter,
        useSortBy,
        usePagination
    );

    const { globalFilter, pageIndex, pageSize } = state;
    const [hoveredRow, setHoveredRow] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [editingRow, setEditingRow] = useState(null);

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

    const handleEdit = (row) => {
        setModalMode('edit');
        setEditingRow(row);
        setModalOpen(true);
    };

    const handleDelete = (row) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            onDelete(row.original);
        }
    };

    const handleModalSubmit = (formData) => {
        if (modalMode === 'add') {
            onAdd(formData);
        } else {
            onEdit(editingRow.original.id, formData);
        }
        setModalOpen(false);
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <Input
                    value={globalFilter || ''}
                    onChange={e => setGlobalFilter(e.target.value)}
                    placeholder="Search all columns..."
                    className="w-1/3"
                />
                <Button onClick={handleAdd} className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Add New
                </Button>
            </div>
            <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                <Table {...getTableProps()} className="w-full">
                    <TableHeader>
                        {headerGroups.map(headerGroup => (
                            <TableRow key={headerGroup.id} {...headerGroup.getHeaderGroupProps()}>
                                {headerGroup.headers.map(column => (
                                    <TableHead
                                        key={column.id}
                                        {...column.getHeaderProps(column.getSortByToggleProps())}
                                        className="font-bold cursor-pointer"
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
                                <TableHead>Actions</TableHead>
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
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                            transition: {
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 20,
                                                delay: i * 0.05
                                            }
                                        }}
                                        exit={{ opacity: 0, x: 20 }}
                                        whileHover={{
                                            scale: 1.02,
                                            x: 10,
                                            boxShadow: "0px 5px 15px rgba(0,0,0,0.1)",
                                            transition: { duration: 0.2 }
                                        }}
                                        onHoverStart={() => setHoveredRow(i)}
                                        onHoverEnd={() => setHoveredRow(null)}
                                        style={{
                                            transformStyle: "preserve-3d",
                                            perspective: "1000px"
                                        }}
                                    >
                                        {row.cells.map(cell => (
                                            <TableCell key={cell.id} {...cell.getCellProps()}>
                                                <motion.div
                                                    initial={false}
                                                    animate={{
                                                        scale: hoveredRow === i ? 1.1 : 1,
                                                        rotateY: hoveredRow === i ? 5 : 0
                                                    }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                                                >
                                                    {cell.render('Cell')}
                                                </motion.div>
                                            </TableCell>
                                        ))}
                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <Button onClick={() => handleEdit(row)} size="sm" variant="outline">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button onClick={() => handleDelete(row)} size="sm" variant="outline" className="text-red-500">
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </div>
            <div className="flex justify-between items-center mt-4">
                <Button
                    onClick={() => previousPage()}
                    disabled={!canPreviousPage}
                    variant="outline"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <div className="flex space-x-2">
                    {pageNumbers.map((number) => (
                        <motion.button
                            key={number}
                            onClick={() => gotoPage(number - 1)}
                            className={`px-3 py-1 rounded ${currentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            whileHover={{ scale: 1.1, rotateY: 15 }}
                            whileTap={{ scale: 0.9 }}
                            style={{ transformStyle: "preserve-3d" }}
                        >
                            {number}
                        </motion.button>
                    ))}
                </div>
                <Button
                    onClick={() => nextPage()}
                    disabled={!canNextPage}
                    variant="outline"
                >
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            <div className="flex justify-end items-center space-x-2">
                <span>Rows per page:</span>
                <Select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                >
                    {[5, 10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </Select>
            </div>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{modalMode === 'add' ? 'Add New Item' : 'Edit Item'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = Object.fromEntries(new FormData(e.target));
                        handleModalSubmit(formData);
                    }}>
                        {columns.map(column => (
                            <div key={column.accessor} className="mb-4">
                                <label htmlFor={column.accessor} className="block text-sm font-medium text-gray-700">
                                    {column.Header}
                                </label>
                                <Input
                                    id={column.accessor}
                                    name={column.accessor}
                                    defaultValue={editingRow ? editingRow.values[column.accessor] : ''}
                                />
                            </div>
                        ))}
                        <div className="flex justify-end space-x-2">
                            <Button type="button" onClick={() => setModalOpen(false)} variant="outline">
                                Cancel
                            </Button>
                            <Button type="submit">
                                {modalMode === 'add' ? 'Add' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ModernTable;