// app/news/news-page.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, RefreshCcw, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchNews } from '@/actions/ai-actions/news-api';

interface Article {
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
    source: {
        name: string;
    };
}

interface ImageErrorEvent extends Event {
    target: HTMLImageElement;
}

const NewsPage = () => {
    const [news, setNews] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('general');
    const [country, setCountry] = useState('us');

    const categories = [
        'general',
        'business',
        'entertainment',
        'health',
        'science',
        'sports',
        'technology',
    ];

    const countries = [
        { code: 'us', name: 'United States' },
        { code: 'gb', name: 'United Kingdom' },
        { code: 'ca', name: 'Canada' },
        { code: 'au', name: 'Australia' },
        { code: 'in', name: 'India' },
    ];

    const handleFetchNews = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.set('category', category);
            formData.set('country', country);
            const result = await fetchNews(category, country);
            if ('data' in result && result.data.articles) {
                setNews(result.data.articles);
            }
        } catch (error) {
            console.error('Error fetching news:', error);
        }
        setLoading(false);
    };

    React.useEffect(() => {
        handleFetchNews();
    }, [category, country]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center space-y-4 text-center mb-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Newspaper className="w-16 h-16 text-primary" />
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold tracking-tight"
                >
                    Global News Hub
                </motion.h1>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>

                <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {countries.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleFetchNews}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                         <RefreshCcw className="h-4 w-4" />
                     )}
                </Button>
            </div>

            {/* News Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardHeader>
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-32 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                 <motion.div
                     variants={container}
                     initial="hidden"
                     animate="show"
                     className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                 >
                     {news.map((article, index) => (
                         <motion.div key={index} variants={item}>
                             <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                                 {article.urlToImage && (
                                     <div className="w-full h-48 overflow-hidden">
                                         <img
                                             src={article.urlToImage}
                                             alt={article.title}
                                             className="w-full h-full object-cover"
                                             onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                 const img = e.currentTarget;
                                                 img.src = '/api/placeholder/400/320';
                                                 img.alt = 'News placeholder image';
                                             }}
                                         />
                                     </div>
                                 )}
                                 <CardHeader>
                                     <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                                     <CardDescription>
                                         {article.source?.name} · {new Date(article.publishedAt).toLocaleDateString()}
                                     </CardDescription>
                                 </CardHeader>
                                 <CardContent>
                                     <p className="line-clamp-3 text-muted-foreground">
                                         {article.description}
                                     </p>
                                 </CardContent>
                                 <CardFooter>
                                     <Button
                                         variant="outline"
                                         className="w-full"
                                         onClick={() => window.open(article.url, '_blank')}
                                     >
                                         Read More
                                     </Button>
                                 </CardFooter>
                             </Card>
                         </motion.div>
                     ))}
                 </motion.div>
             )}
        </div>
    );
};

export default NewsPage;
