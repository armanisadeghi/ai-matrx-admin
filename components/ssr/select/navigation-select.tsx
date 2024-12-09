import React from 'react';
import Link from 'next/link';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Types that actually impact functionality
type SelectOption = {
    value: string;
    label: string;
};

type BaseSelectProps = {
    options: SelectOption[];
    defaultValue?: string;
    placeholder?: string;
    className?: string;
};

// Server Components
export function BaseSelect(
    {
        options,
        defaultValue,
        placeholder = "Select an option",
        className,
    }: BaseSelectProps) {
    return (
        <Select defaultValue={defaultValue}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder}/>
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

// Link-based navigation (fully server-side)
export function NavigationSelect(
    {
        options,
        basePath,
        defaultValue,
        placeholder,
        className,
    }: BaseSelectProps & { basePath: string }) {
    return (
        <div className="grid">
            {options.map((option) => (
                <Link
                    key={option.value}
                    href={`${basePath}/${option.value}`}
                    className={option.value === defaultValue ? 'hidden' : ''}
                >
                    <BaseSelect
                        options={options}
                        defaultValue={option.value}
                        placeholder={placeholder}
                        className={className}
                    />
                </Link>
            ))}
            {defaultValue && (
                <BaseSelect
                    options={options}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    className={className}
                />
            )}
        </div>
    );
}

// // Client wrapper for programmatic navigation
// 'use client';
//
// import { useRouter } from 'next/navigation';
//
// export function ClientNavigationSelect({
//                                            options,
//                                            basePath,
//                                            defaultValue,
//                                            placeholder,
//                                            className,
//                                        }: BaseSelectProps & { basePath: string }) {
//     const router = useRouter();
//
//     return (
//         <div onChange={(e: any) => {
//             const value = e.target.value;
//             if (value) {
//                 router.push(`${basePath}/${value}`);
//             }
//         }}>
//             <BaseSelect
//                 options={options}
//                 defaultValue={defaultValue}
//                 placeholder={placeholder}
//                 className={className}
//             />
//         </div>
//     );
// }
