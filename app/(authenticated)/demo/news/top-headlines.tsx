// app/news/top-headlines.tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

async function getTopHeadlines() {
    console.log('process.env.NEWS_API_KEY', process.env.NEWS_API_KEY);
    const res = await fetch(
        `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`,
        { next: { revalidate: 900 } } // Cache for 15 minutes
    );

    if (!res.ok) {
        throw new Error('Failed to fetch top headlines');
    }

    const data = await res.json();
    return data.articles;
}

export async function TopHeadlines() {
    const headlines = await getTopHeadlines();

    return (
        <div className="space-y-4 mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Breaking News</h2>
            <div className="space-y-3">
                {headlines.map((headline: any, index: number) => (
                    <Alert key={index} className="relative">
                        <AlertTitle className="pr-8">
                            {headline.source.name}
                        </AlertTitle>
                        <AlertDescription className="pr-8">
                            <a
                                href={headline.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                {headline.title}
                            </a>
                        </AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2"
                            onClick={() => {
                                // We'll need to handle this in the client component
                                const alert = document.getElementById(`headline-${index}`);
                                if (alert) alert.remove();
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                ))}
            </div>
        </div>
    );
}
