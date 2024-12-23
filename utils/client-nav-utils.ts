'use client';
import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function getCurrentParsedPathName() {
    const pathName = usePathname();
    const segments = pathName.split('/').filter(Boolean);
    const result = segments.map((segment, index) => {
        const toTitleCase = (str: string) =>
            str
                .replace(/[_-]/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

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

export function getParsedPathNameAndSearchParams() {
    const parsedPathName = getCurrentParsedPathName();
    const parsedSearchParams = getParsedSearchParams();

    return {
        pathName: parsedPathName,
        searchParams: parsedSearchParams,
    };
}
