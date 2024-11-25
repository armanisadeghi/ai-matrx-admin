// hooks/useHelpContent.ts
import { helpContent } from './help-content';
import { HelpContent } from './types';

export const useHelpContent = (source: string): HelpContent | null => {
    if (!source || !helpContent[source]) {
        console.warn(`Help content for "${source}" not found`);
        return null;
    }

    return helpContent[source];
};
