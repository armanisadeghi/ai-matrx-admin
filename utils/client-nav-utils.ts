'use client';
import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Parse the pathname
export function getCurrentParsedPathName() {
    const pathName = usePathname();
    const segments = pathName.split('/').filter(Boolean); // Remove empty segments from leading or trailing slashes
    const result = segments.map((segment, index) => {
        const toTitleCase = (str: string) =>
            str
                .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
                .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces between camelCase or PascalCase
                .replace(/\s+/g, ' ') // Normalize extra spaces
                .trim() // Remove leading/trailing spaces
                .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()); // Title Case each word

        const href = '/' + segments.slice(0, index + 1).join('/');
        const name = toTitleCase(segment);

        return {
            href,
            id: segment,
            name,
            isLast: index === segments.length - 1,
        };
    });

    return result;
}

// Parse search params
export function getParsedSearchParams() {
    const searchParams = useSearchParams();
    const result: { key: string; value: string; encoded: string }[] = [];

    searchParams.forEach((value, key) => {
        result.push({
            key,
            value,
            encoded: encodeURIComponent(`${key}=${value}`),
        });
    });

    return result;
}

// Get both parsed pathname and search params
export function getParsedPathNameAndSearchParams() {
    const parsedPathName = getCurrentParsedPathName();
    const parsedSearchParams = getParsedSearchParams();

    return {
        pathName: parsedPathName,
        searchParams: parsedSearchParams,
    };
}
