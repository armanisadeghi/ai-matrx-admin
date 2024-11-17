// hooks/useActionRouting.ts
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { RouteConfig } from '../types';

export const useActionRouting = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const navigateToAction = useCallback(
        (config: RouteConfig) => {
            const url = new URL(config.path, window.location.origin);

            // Add query parameters
            if (config.query) {
                Object.entries(config.query).forEach(([key, value]) => {
                    url.searchParams.set(key, value.toString());
                });
            }

            router.push(url.pathname + url.search, {
                scroll: config.scroll ?? true
            });
        },
        [router]
    );

    const getActionUrl = useCallback(
        (config: RouteConfig) => {
            const params = new URLSearchParams(searchParams);

            if (config.query) {
                Object.entries(config.query).forEach(([key, value]) => {
                    params.set(key, value.toString());
                });
            }

            return `${config.path}?${params.toString()}`;
        },
        [searchParams]
    );

    return {
        navigateToAction,
        getActionUrl,
        currentPath: pathname,
        queryParams: searchParams
    };
};

