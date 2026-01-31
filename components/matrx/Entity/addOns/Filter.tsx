import {Column} from "@tanstack/react-table";
import DebouncedInput from "./DebouncedInput";


export function Filter({ column }: { column: Column<any, unknown> }) {
    const columnFilterValue = column.getFilterValue()
    const { filterVariant } = column.columnDef.meta ?? {}

    return filterVariant === 'range' ? (
        <div>
            <div className="flex space-x-2">
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue as [number, number])?.[0] ?? ''}
                    onChange={value =>
                        column.setFilterValue((old: [number, number]) => [value, old?.[1]])
                    }
                    placeholder={`Min`}
                    className="w-24 border shadow rounded"
                />
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue as [number, number])?.[1] ?? ''}
                    onChange={value =>
                        column.setFilterValue((old: [number, number]) => [old?.[0], value])
                    }
                    placeholder={`Max`}
                    className="w-24 border shadow rounded"
                />
            </div>
        </div>
    ) : filterVariant === 'select' ? (
        <select
            onChange={e => column.setFilterValue(e.target.value)}
            value={columnFilterValue?.toString()}
            className="w-full border rounded p-1"
        >
            <option value="">All</option>
            {column.columnDef.meta?.filterOptions?.map((option: string) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    ) : (
            <DebouncedInput
                className="w-36 border shadow rounded"
                onChange={value => column.setFilterValue(value)}
                placeholder={`Search...`}
                type="text"
                value={(columnFilterValue ?? '') as string}
            />
        )
}
