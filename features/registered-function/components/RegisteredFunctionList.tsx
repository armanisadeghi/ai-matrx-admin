"use client";

import React, { useEffect, useState } from 'react';
import { useRegisteredFunction } from '@/features/registered-function/hooks/useRegisteredFunction';
import { 
    Table, 
    TableHeader, 
    TableBody, 
    TableRow, 
    TableCell,
    TableHead
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
    Pagination, 
    PaginationContent, 
    PaginationItem, 
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis
} from "@/components/ui/pagination";
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

    // Helper function to generate pagination items
    const getPaginationItems = () => {
        const items = [];
        const maxVisible = 5;
        
        if (pages <= maxVisible) {
            for (let i = 1; i <= pages; i++) {
                items.push(i);
            }
        } else {
            if (page <= 3) {
                for (let i = 1; i <= 4; i++) {
                    items.push(i);
                }
                items.push('ellipsis');
                items.push(pages);
            } else if (page >= pages - 2) {
                items.push(1);
                items.push('ellipsis');
                for (let i = pages - 3; i <= pages; i++) {
                    items.push(i);
                }
            } else {
                items.push(1);
                items.push('ellipsis');
                items.push(page - 1);
                items.push(page);
                items.push(page + 1);
                items.push('ellipsis');
                items.push(pages);
            }
        }
        
        return items;
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Registered Functions</h1>
            {loading && <p className="text-muted-foreground">Loading...</p>}
            {error && <p className="text-destructive">Error: {JSON.stringify(error)}</p>}
            {!loading && !error && (
                <>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Module Path</TableHead>
                                    <TableHead>Class Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
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
                                                variant="destructive"
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
                    </div>
                    {pages > 1 && (
                        <div className="flex justify-center mt-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            href="#" 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (page > 1) setPage(page - 1);
                                            }}
                                            className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    {getPaginationItems().map((item, index) => (
                                        <PaginationItem key={index}>
                                            {item === 'ellipsis' ? (
                                                <PaginationEllipsis />
                                            ) : (
                                                <PaginationLink
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setPage(item as number);
                                                    }}
                                                    isActive={page === item}
                                                >
                                                    {item}
                                                </PaginationLink>
                                            )}
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext 
                                            href="#" 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (page < pages) setPage(page + 1);
                                            }}
                                            className={page === pages ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RegisteredFunctionsList;
