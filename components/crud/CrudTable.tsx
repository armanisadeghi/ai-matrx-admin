import React, {useState, useEffect} from 'react';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {ChevronDown, ChevronUp, MoreHorizontal} from 'lucide-react';
import {MatrixPagination} from "@/components/matrx/pagination";
import ThreeDotMenu from "@/components/matrx/three-dot-menu";

interface CrudTableProps<T> {
    items: T[];
    fields: Record<string, {
        type: 'text' | 'textarea' | 'select';
        label: string;
        options?: { value: string; label: string }[]
    }>;
    getItemId: (item: T) => string;
    onItemSelect: (id: string) => void;
    totalCount: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
}

export function CrudTable<T>(
    {
        items,
        fields,
        getItemId,
        onItemSelect,
        totalCount,
        currentPage,
        itemsPerPage,
        onPageChange,
        onItemsPerPageChange,
    }: CrudTableProps<T>) {
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(currentPage);

    const getMenuItems = (item: T) => [
        {text: 'View', onClick: (id: string) => onItemSelect(id)},
        {text: 'Edit', onClick: (id: string) => onItemSelect(id)},
        {text: 'Delete', onClick: (id: string) => onItemSelect(id)},
    ];

    useEffect(() => {
        setPage(currentPage);
    }, [currentPage]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedItems = [...items].sort((a, b) => {
        if (!sortField) return 0;
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const paginatedItems = sortedItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="overflow-x-auto">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            {Object.entries(fields).map(([key, field]) => (
                                <TableHead key={key} className="whitespace-nowrap cursor-pointer"
                                           onClick={() => handleSort(key)}>
                                    {field.label}
                                    {sortField === key && (sortDirection === 'asc' ?
                                        <ChevronUp className="inline ml-1"/> : <ChevronDown className="inline ml-1"/>)}
                                </TableHead>
                            ))}
                            <TableHead className="whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                </Table>
            </div>
            <div className="overflow-y-auto flex-grow">
                <Table className="w-full">
                    <TableBody>
                        {paginatedItems.map(item => (
                            <TableRow
                                key={getItemId(item)}
                                className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                onClick={() => onItemSelect(getItemId(item))}
                            >
                                {Object.keys(fields).map((key) => (
                                    <TableCell key={key}
                                               className="max-w-[200px] overflow-hidden text-ellipsis">
                                        <div className="truncate" title={(item as any)[key]}>
                                            {(item as any)[key]}
                                        </div>
                                    </TableCell>
                                ))}
                                <TableCell className="whitespace-nowrap">
                                    <ThreeDotMenu items={getMenuItems(item)} itemId={getItemId(item)}/>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4">
                <MatrixPagination
                    totalCount={totalCount}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={onPageChange}
                    onItemsPerPageChange={onItemsPerPageChange}
                />
            </div>
        </div>
    );
}
