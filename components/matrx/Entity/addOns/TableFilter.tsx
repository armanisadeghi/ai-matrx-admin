// components/table/TableFilter.tsx
import * as React from 'react';
import { Column } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';

interface FilterProps<TData> {
    column: Column<TData, unknown>
}

export function TableFilter<TData>({ column }: FilterProps<TData>) {
    const columnFilterValue = column.getFilterValue();
    const { filterVariant } = column.columnDef.meta ?? {};

    if (!filterVariant) return null;

    switch (filterVariant) {
        case 'range':
            return (
                <div className="flex space-x-2">
                    <Input
                        type="number"
                        value={((columnFilterValue as [string, string])?.[0] ?? '').toString()}
                        onChange={(e) =>
                            column.setFilterValue((old: [string, string]) => [
                                e.target.value,
                                old?.[1] ?? ''
                            ])
                        }
                        placeholder="Min"
                        className="w-20"
                    />
                    <Input
                        type="number"
                        value={((columnFilterValue as [string, string])?.[1] ?? '').toString()}
                        onChange={(e) =>
                            column.setFilterValue((old: [string, string]) => [
                                old?.[0] ?? '',
                                e.target.value
                            ])
                        }
                        placeholder="Max"
                        className="w-20"
                    />
                </div>
            );

        case 'select':
            return (
                <select
                    value={(columnFilterValue ?? '').toString()}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    className="w-full border rounded p-1"
                >
                    <option value="">All</option>
                    {column.columnDef.meta?.filterOptions?.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            );

        default:
            return (
                <Input
                    value={(columnFilterValue ?? '').toString()}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    placeholder="Search..."
                    className="w-36"
                />
            );
    }
}
