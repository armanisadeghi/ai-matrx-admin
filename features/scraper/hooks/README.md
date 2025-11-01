# useScraperContent Hook

A simplified React hook for scraping URLs and extracting content without the UI components.

## Overview

`useScraperContent` wraps the scraper socket functionality and handles data extraction, providing easy access to text content and other scraped data. It manages the complete flow from triggering the scrape to processing and extracting the results.

## Features

- ✅ Trigger web scraping with a single function call
- ✅ Automatic data processing and extraction
- ✅ Access to text content, metadata, images, links, and more
- ✅ Built-in loading, error, and completion states
- ✅ Redux integration for state management
- ✅ TypeScript support with full type definitions

## Installation

The hook is already part of the scraper feature. Import it from:

```typescript
import { useScraperContent } from "@/features/scraper/hooks";
```

## Basic Usage

```tsx
import { useScraperContent } from "@/features/scraper/hooks";

function MyComponent() {
    const { scrapeUrl, data, isLoading, hasError, error } = useScraperContent();

    const handleScrape = async () => {
        await scrapeUrl("https://example.com");
    };

    return (
        <div>
            <button onClick={handleScrape} disabled={isLoading}>
                Scrape URL
            </button>
            
            {isLoading && <p>Loading...</p>}
            {hasError && <p>Error: {error}</p>}
            {data && <p>Text Content: {data.textContent}</p>}
        </div>
    );
}
```

## API Reference

### Return Values

```typescript
interface UseScraperContentReturn {
    // Main data
    data: ScraperContentResult | null;
    
    // State flags
    isLoading: boolean;
    isCompleted: boolean;
    hasError: boolean;
    error: string | null;
    
    // Control methods
    scrapeUrl: (url: string) => Promise<void>;
    reset: () => void;
    
    // Task info
    taskId: string | null;
    taskStatus: string | null;
}
```

### Data Structure

The `data` object contains:

```typescript
interface ScraperContentResult {
    // Primary content
    textContent: string;  // Plain text extracted from the page
    
    // Page information
    overview: {
        page_title?: string;
        url?: string;
        website?: string;
        char_count?: number;
        has_structured_content?: boolean;
        outline?: { [key: string]: string[] };
    };
    
    // Organized content
    organizedData: object;      // Content organized by headings
    structuredData: object;     // Structured data (ordered lists, etc.)
    
    // Links and media
    links: {
        internal?: string[];
        external?: string[];
        images?: string[];
        documents?: string[];
        others?: string[];
        audio?: string[];
        videos?: string[];
        archives?: string[];
    };
    images: string[];           // All image URLs
    mainImage: string | null;   // Primary image URL
    
    // Additional data
    metadata: {
        execution_time_ms?: number | null;
    };
    hashes: string[] | null;
    contentFilterDetails: any[];
    scrapedAt: string;
    
    // Raw data for custom processing
    rawProcessedData: any;
}
```

## Usage Examples

### Example 1: Basic Text Extraction

```tsx
function TextExtractor() {
    const { scrapeUrl, data, isLoading } = useScraperContent();
    const [url, setUrl] = useState("");

    const handleExtract = async () => {
        await scrapeUrl(url);
    };

    return (
        <div>
            <input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL"
            />
            <button onClick={handleExtract} disabled={isLoading}>
                Extract Text
            </button>
            {data && (
                <div>
                    <h2>{data.overview.page_title}</h2>
                    <p>{data.textContent}</p>
                </div>
            )}
        </div>
    );
}
```

### Example 2: Image Extraction

```tsx
function ImageExtractor() {
    const { scrapeUrl, data } = useScraperContent();

    const handleScrape = async () => {
        await scrapeUrl("https://example.com");
    };

    return (
        <div>
            <button onClick={handleScrape}>Get Images</button>
            {data && (
                <div>
                    <p>Found {data.images.length} images</p>
                    {data.mainImage && (
                        <img src={data.mainImage} alt="Main" />
                    )}
                    <div>
                        {data.images.map((img, i) => (
                            <img key={i} src={img} alt="" />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
```

### Example 3: Link Analysis

```tsx
function LinkAnalyzer() {
    const { scrapeUrl, data, isLoading } = useScraperContent();

    const analyzePage = async (url: string) => {
        await scrapeUrl(url);
    };

    return (
        <div>
            <button onClick={() => analyzePage("https://example.com")}>
                Analyze Links
            </button>
            {isLoading && <p>Analyzing...</p>}
            {data && (
                <div>
                    <h3>Link Analysis</h3>
                    <p>Internal: {data.links.internal?.length || 0}</p>
                    <p>External: {data.links.external?.length || 0}</p>
                    <p>Images: {data.images.length}</p>
                    <p>Documents: {data.links.documents?.length || 0}</p>
                </div>
            )}
        </div>
    );
}
```

### Example 4: Error Handling

```tsx
function RobustScraper() {
    const { scrapeUrl, data, isLoading, hasError, error, reset } = useScraperContent();

    const handleScrape = async (url: string) => {
        try {
            await scrapeUrl(url);
        } catch (err) {
            console.error("Scrape failed:", err);
        }
    };

    return (
        <div>
            <button onClick={() => handleScrape("https://example.com")}>
                Scrape
            </button>
            
            {isLoading && <div>Loading...</div>}
            
            {hasError && (
                <div>
                    <p>Error: {error}</p>
                    <button onClick={reset}>Try Again</button>
                </div>
            )}
            
            {data && (
                <div>
                    <p>Success! Scraped: {data.overview.page_title}</p>
                    <button onClick={reset}>Scrape Another</button>
                </div>
            )}
        </div>
    );
}
```

### Example 5: Processing Multiple URLs

```tsx
function BatchScraper() {
    const { scrapeUrl, data, isLoading, reset } = useScraperContent();
    const [results, setResults] = useState<any[]>([]);

    const scrapeMultiple = async (urls: string[]) => {
        const scraped = [];
        
        for (const url of urls) {
            await scrapeUrl(url);
            // Wait for data to be available
            // Note: In production, you'd want to handle this more elegantly
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (data) {
                scraped.push({
                    url,
                    title: data.overview.page_title,
                    content: data.textContent,
                });
            }
            
            reset(); // Reset for next scrape
        }
        
        setResults(scraped);
    };

    return (
        <div>
            <button onClick={() => scrapeMultiple([
                "https://example.com",
                "https://example.org"
            ])}>
                Scrape Multiple URLs
            </button>
            {results.map((result, i) => (
                <div key={i}>
                    <h3>{result.title}</h3>
                    <p>{result.content.slice(0, 100)}...</p>
                </div>
            ))}
        </div>
    );
}
```

### Example 6: React to Data Changes

```tsx
function DataReactive() {
    const { scrapeUrl, data } = useScraperContent();

    // React to data changes
    useEffect(() => {
        if (data) {
            console.log("New data received:", data.overview.page_title);
            // Do something with the data
        }
    }, [data]);

    return (
        <button onClick={() => scrapeUrl("https://example.com")}>
            Scrape
        </button>
    );
}
```

## Advanced Usage

### Accessing Raw Data

If you need access to data not exposed in the simplified interface:

```tsx
const { data } = useScraperContent();

// Access the raw processed data
const rawData = data?.rawProcessedData;

// Access all results (not just the first one)
const allResults = rawData?.results;
```

### Custom Data Processing

```tsx
function CustomProcessor() {
    const { scrapeUrl, data } = useScraperContent();

    const processData = (scraperData: ScraperContentResult) => {
        // Custom processing logic
        const wordCount = scraperData.textContent.split(/\s+/).length;
        const linkDensity = scraperData.links.external?.length || 0;
        
        return {
            wordCount,
            linkDensity,
            hasImages: scraperData.images.length > 0,
        };
    };

    return (
        <div>
            <button onClick={() => scrapeUrl("https://example.com")}>
                Scrape & Process
            </button>
            {data && (
                <pre>{JSON.stringify(processData(data), null, 2)}</pre>
            )}
        </div>
    );
}
```

## State Management

The hook automatically manages state through Redux. The task lifecycle:

1. **Idle**: No task running
2. **Submitted**: Task submitted, scraping in progress (`isLoading = true`)
3. **Completed**: Task finished, data available (`isCompleted = true`, `data` populated)
4. **Error**: Task failed (`hasError = true`, `error` populated)

## Performance Considerations

- The hook creates a scraper task that runs on the backend
- Scraping can take several seconds depending on the target URL
- Data is cached in Redux and persists until reset
- Use `reset()` to clear data and prepare for a new scrape

## Integration with Existing Code

The hook uses the same underlying infrastructure as the UI components:

- `useScraperSocket` - Socket management
- `ScraperDataUtils` - Data processing
- Redux selectors - State management

This ensures consistency and reliability across the application.

## Troubleshooting

**Hook returns null data:**
- Check if the URL is valid
- Check if the task completed (`isCompleted`)
- Check for errors (`hasError`, `error`)

**Data is stale:**
- Call `reset()` before scraping a new URL
- Check Redux DevTools to inspect task state

**Scraping takes too long:**
- Some websites are slow or complex
- Check the `taskStatus` to see current state
- Consider implementing a timeout

## Contributing

When extending this hook:
1. Maintain backward compatibility
2. Update TypeScript types
3. Add tests for new functionality
4. Update this documentation

## Related

- `useScraperSocket` - Lower-level socket management
- `ScraperResultsComponent` - UI component for displaying results
- `ScraperDataUtils` - Data processing utilities

