import * as React from 'react';

export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = React.useState(false);

    React.useEffect(() => {
        const media = window.matchMedia(query);
        const updateMatch = (e: MediaQueryListEvent | MediaQueryList) => {
            setMatches(e.matches);
        };

        updateMatch(media);

        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', updateMatch);
            return () => media.removeEventListener('change', updateMatch);
        } else {
            media.addListener(updateMatch);
            return () => media.removeListener(updateMatch);
        }
    }, [query]);

    return matches;
};
