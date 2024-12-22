import React from 'react';

export function parsePathname(pathName: string) {
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
