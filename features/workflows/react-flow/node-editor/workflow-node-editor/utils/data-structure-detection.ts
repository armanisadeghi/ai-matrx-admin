interface EventData {
    date: string;
    name: string;
    venue: string;
    time: string;
    link: string;
    info: string;
}

interface SitemapData {
    sitemap_links: string[];
    links: {
        [subdomain: string]: string[];
    };
}

interface ResponseStructure {
    success: boolean;
    data: EventData[] | SitemapData | any | null;
    errors: string | null;
    execution_time_ms: number;
}

// Registry of known types with their validation functions
type TypeValidator = (data: any) => boolean;
interface TypeDefinition {
    name: string;
    validator: TypeValidator;
}

const typeRegistry: TypeDefinition[] = [
    {
        name: 'EventsViewer',
        validator: (data: any): boolean => {
            if (!Array.isArray(data) || data.length === 0) return false;
            const firstItem = data[0];
            return typeof firstItem === 'object' &&
                firstItem !== null &&
                'date' in firstItem &&
                'name' in firstItem &&
                'venue' in firstItem &&
                'time' in firstItem &&
                'link' in firstItem &&
                'info' in firstItem;
        }
    },
    {
        name: 'SitemapViewer',
        validator: (data: any): boolean => {
            return typeof data === 'object' &&
                data !== null &&
                !Array.isArray(data) &&
                'sitemap_links' in data &&
                'links' in data &&
                Array.isArray(data.sitemap_links) &&
                typeof data.links === 'object';
        }
    }
    // Add more type definitions here as needed
];

export function detectResponseType(response: ResponseStructure): string {
    if (!response || !response.success || response.data === null) {
        return 'Unknown';
    }

    for (const typeDef of typeRegistry) {
        if (typeDef.validator(response.data)) {
            return typeDef.name;
        }
    }

    return 'Unknown';
}

// Utility to register new types dynamically
export function registerType(name: string, validator: TypeValidator): void {
    typeRegistry.push({ name, validator });
}