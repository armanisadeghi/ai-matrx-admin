"use client";

import React, { useEffect, useState } from 'react';
import { useRegisteredFunction } from '@/features/registered-function/hooks/useRegisteredFunction';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Pagination } from "@heroui/react";
import { RegisteredFunctionBase } from '@/types/registeredFunctionTypes';

const RegisteredFunctionsList: React.FC = () => {
    const {
        items,
        loading,
        error,
        totalCount,
        fetchPaginated,
        deleteOne,
    } = useRegisteredFunction();

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        fetchPaginated({
            featureName: 'registeredFunction',
            page,
            pageSize: rowsPerPage,
            includeAllIdsNames: true
        });


    }, [fetchPaginated, page]);

    const handleDelete = (id: string) => {
        deleteOne({ featureName: 'registeredFunction', id });
    };

    const pages = Math.ceil(totalCount / rowsPerPage);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Registered Functions</h1>
            {loading && <p className="text-gray-600">Loading...</p>}
            {error && <p className="text-red-500">Error: {JSON.stringify(error)}</p>}
            {!loading && !error && (
                <>
                    <Table aria-label="Registered Functions table">
                        <TableHeader>
                            <TableColumn>Name</TableColumn>
                            <TableColumn>Module Path</TableColumn>
                            <TableColumn>Class Name</TableColumn>
                            <TableColumn>Description</TableColumn>
                            <TableColumn>Actions</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {Object.values(items).map((item: RegisteredFunctionBase) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.modulePath || 'N/A'}</TableCell>
                                    <TableCell>{item.className || 'N/A'}</TableCell>
                                    <TableCell>{item.description || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Button
                                            color="danger"
                                            size="sm"
                                            onClick={() => handleDelete(item.id)}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex justify-center mt-4">
                        <Pagination
                            total={pages}
                            page={page}
                            onChange={(page) => setPage(page)}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default RegisteredFunctionsList;
