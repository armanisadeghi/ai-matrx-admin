'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    TrendingUp, 
    Clock, 
    Trophy, 
    Sparkles,
    Filter
} from 'lucide-react';
import { CanvasCard } from '@/components/canvas/discovery/CanvasCard';
import { cn } from '@/lib/utils';
import type { SharedCanvasItem, CanvasType } from '@/types/canvas-social';
import Link from 'next/link';

type SortOption = 'trending' | 'recent' | 'popular' | 'top-scored';

export function CanvasDiscovery() {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('trending');
    const [filterType, setFilterType] = useState<CanvasType | 'all'>('all');
    const supabase = getBrowserSupabaseClient();

    const { data: canvases = [], isLoading } = useQuery({
        queryKey: ['discover-canvases', sortBy, filterType, searchTerm],
        queryFn: async () => {
            let query = supabase
                .from('shared_canvas_items')
                .select('*')
                .eq('visibility', 'public');

            // Apply type filter
            if (filterType !== 'all') {
                query = query.eq('canvas_type', filterType);
            }

            // Apply search
            if (searchTerm) {
                query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);
            }

            // Apply sorting
            switch (sortBy) {
                case 'trending':
                    // Trending = recent with high engagement
                    query = query
                        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                        .order('like_count', { ascending: false })
                        .order('view_count', { ascending: false });
                    break;
                case 'recent':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'popular':
                    query = query
                        .order('like_count', { ascending: false })
                        .order('view_count', { ascending: false });
                    break;
                case 'top-scored':
                    query = query
                        .eq('has_scoring', true)
                        .order('high_score', { ascending: false });
                    break;
            }

            const { data, error } = await query.limit(50);

            if (error) throw error;
            return data as SharedCanvasItem[];
        },
        staleTime: 1000 * 60, // 1 minute
    });

    // Get unique canvas types from data for filtering
    const availableTypes = Array.from(
        new Set(canvases.map(c => c.canvas_type))
    ).sort();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <Sparkles className="w-12 h-12" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold">
                            Discover Amazing Content
                        </h1>
                        <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                            Explore interactive quizzes, flashcards, presentations, and more created by our community
                        </p>
                        <div className="flex justify-center gap-4 pt-4">
                            <Link href="/">
                                <Button variant="secondary" size="lg">
                                    Create Your Own
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search & Filters */}
                <div className="space-y-4 mb-8">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search canvases..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 py-6 text-lg"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="trending">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Trending
                                    </div>
                                </SelectItem>
                                <SelectItem value="recent">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Recent
                                    </div>
                                </SelectItem>
                                <SelectItem value="popular">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Most Popular
                                    </div>
                                </SelectItem>
                                <SelectItem value="top-scored">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4" />
                                        Top Scored
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                            <SelectTrigger className="w-full sm:w-48">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {availableTypes.map(type => (
                                    <SelectItem key={type} value={type} className="capitalize">
                                        {type.replace('-', ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {(searchTerm || filterType !== 'all') && (
                            <Button 
                                variant="outline"
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterType('all');
                                }}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </div>

                {/* Results */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : canvases.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-gray-400 dark:text-gray-600 space-y-3">
                            <p className="text-lg font-medium">No canvases found</p>
                            <p className="text-sm">
                                {searchTerm || filterType !== 'all' 
                                    ? 'Try adjusting your filters'
                                    : 'Be the first to create something amazing!'
                                }
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                            Showing {canvases.length} canvas{canvases.length !== 1 ? 'es' : ''}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {canvases.map(canvas => (
                                <CanvasCard key={canvas.id} canvas={canvas} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

