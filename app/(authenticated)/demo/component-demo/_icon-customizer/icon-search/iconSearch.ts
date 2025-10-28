// iconSearch.ts
import { useState, useEffect } from 'react';
import { ICON_REGISTRY } from './iconRegistry';

type IconInfo = {
    type: string;
    import: string;
    searchTerms?: string[];
};

export const MAX_RESULTS = 20;
export const MIN_SEARCH_LENGTH = 2;

function searchIcons(searchTerm: string): IconInfo[] {
    // Don't search if term is too short
    if (!searchTerm || searchTerm.length < MIN_SEARCH_LENGTH) {
        return [];
    }

    const terms = searchTerm.toLowerCase().trim().split(/\s+/);
    const results = new Set<IconInfo>();

    // Search through registry
    Object.entries(ICON_REGISTRY).forEach(([library, icons]) => {
        Object.entries(icons).forEach(([name, iconInfo]) => {
            // Only process until we hit our limit
            if (results.size >= MAX_RESULTS) return;

            // Check if all terms match either the name or search terms
            const matches = terms.every(term => {
                const nameLower = name.toLowerCase();
                if (nameLower.includes(term)) return true;

                return iconInfo.searchTerms?.some(searchTerm =>
                    searchTerm.toLowerCase().includes(term)
                );
            });

            if (matches) {
                results.add(iconInfo as IconInfo);
            }
        });
    });

    return Array.from(results);
}

export function useIconSearch(searchTerm: string) {
    const [results, setResults] = useState<IconInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isStale = false;

        // Don't search if term is too short
        if (!searchTerm || searchTerm.length < MIN_SEARCH_LENGTH) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const timeoutId = setTimeout(() => {
            try {
                const searchResults = searchIcons(searchTerm);
                if (!isStale) {
                    setResults(searchResults);
                }
            } catch (err) {
                if (!isStale) {
                    setError(err instanceof Error ? err.message : 'Search failed');
                }
            } finally {
                if (!isStale) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            isStale = true;
            clearTimeout(timeoutId);
        };
    }, [searchTerm]);

    return {
        results,
        loading,
        error,
        tooShort: searchTerm.length > 0 && searchTerm.length < MIN_SEARCH_LENGTH
    };
}