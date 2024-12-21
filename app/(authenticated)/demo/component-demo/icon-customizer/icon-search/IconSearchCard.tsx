// IconSearchCard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { loadIcon } from './iconLoader';
import { useIconSearch, MAX_RESULTS, MIN_SEARCH_LENGTH } from './iconSearch'; // Add MAX_RESULTS to the import

type IconInfo = {
    type: string;
    import: string;
    searchTerms?: string[];
};

const IconPreview = ({ iconInfo, onClick }: { iconInfo: IconInfo; onClick?: (info: IconInfo) => void }) => {
    const [IconComponent, setIconComponent] = useState<any>(null);

    useEffect(() => {
        let mounted = true;

        loadIcon(iconInfo).then(Component => {
            if (mounted) {
                setIconComponent(() => Component);
            }
        });

        return () => {
            mounted = false;
        };
    }, [iconInfo]);

    if (!IconComponent) {
        return (
            <div className="w-10 h-10 flex items-center justify-center animate-pulse bg-gray-200 dark:bg-gray-800 rounded" />
        );
    }

    const commonButtonClasses = "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 group flex flex-col items-center gap-1 min-h-[25px] w-full";
    const commonIconWrapperClasses = "w-10 h-10 flex items-center justify-center mb-1";
    const commonTextClasses = "text-xs text-gray-600 dark:text-gray-400 text-center px-1 break-words";

    // For Lucide icons
    if (iconInfo.type === 'lucide') {
        return (
            <button
                onClick={() => onClick?.(iconInfo)}
                className={commonButtonClasses}
                title={iconInfo.import}
            >
                <div className={commonIconWrapperClasses}>
                    <IconComponent
                        className="w-6 h-6 group-hover:text-blue-500 transition-colors duration-200"
                        aria-hidden="true"
                    />
                </div>
                <span className={commonTextClasses}>
                    {iconInfo.import}
                </span>
            </button>
        );
    }

    // For Tabler icons
    if (iconInfo.type === 'tabler') {
        return (
            <button
                onClick={() => onClick?.(iconInfo)}
                className={commonButtonClasses}
                title={iconInfo.import}
            >
                <div className={commonIconWrapperClasses}>
                    <IconComponent
                        size={24}
                        className="group-hover:text-blue-500 transition-colors duration-200"
                        aria-hidden="true"
                    />
                </div>
                <span className={commonTextClasses}>
                    {iconInfo.import}
                </span>
            </button>
        );
    }

    return null;
};

type IconSearchCardProps = {
    onIconSelect?: (iconInfo: IconInfo) => void;
};

const IconSearchCard = ({ onIconSelect }: IconSearchCardProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { results, loading, error, tooShort } = useIconSearch(searchTerm);

    return (
        <Card className="w-full max-w-3xl">
            <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Icon Search
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`Search icons (min ${MIN_SEARCH_LENGTH} characters)...`}
                        className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        {tooShort ? (
                            <p>Please enter at least {MIN_SEARCH_LENGTH} characters</p>
                        ) : (
                            <>
                                <p>{results.length} icons found</p>
                                {results.length === MAX_RESULTS && (
                                    <p>Showing top {MAX_RESULTS} results</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <ScrollArea className="h-[600px] pr-4">
                    {error ? (
                        <div className="text-red-500 p-4 text-center">
                            {error}
                        </div>
                    ) : loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-full h-[100px] animate-pulse bg-gray-200 dark:bg-gray-800 rounded"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {results.map((iconInfo) => (
                                <IconPreview
                                    key={`${iconInfo.type}-${iconInfo.import}`}
                                    iconInfo={iconInfo}
                                    onClick={onIconSelect}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default IconSearchCard;