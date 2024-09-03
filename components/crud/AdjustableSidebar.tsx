import React, {useState, useCallback} from 'react';
import {Input} from '@/components/ui/input';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Label} from '@/components/ui/label';
import {ScrollArea} from '@/components/ui/scroll-area';

interface AdjustableSidebarProps<T> {
    items: T[];
    getItemId: (item: T) => string;
    getItemName: (item: T) => string;
    onItemSelect: (id: string) => void;
    onSearch: (query: string, searchAll: boolean) => void;
    className?: string;
}

export function AdjustableSidebar<T>(
    {
        items,
        getItemId,
        getItemName,
        onItemSelect,
        onSearch,
        className = '',
    }: AdjustableSidebarProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('nameAndId');
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (isDragging) {
                const newWidth = e.clientX;
                setSidebarWidth(newWidth);
            }
        },
        [isDragging]
    );

    React.useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousemove', handleMouseMove as any);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousemove', handleMouseMove as any);
        };
    }, [handleMouseUp, handleMouseMove]);

    return (
        <div
            className={`relative ${className}`}
            style={{width: `${sidebarWidth}px`, minWidth: '200px', maxWidth: '50%'}}
        >
            <div className="h-full overflow-hidden border-r p-4">
                <Input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        onSearch(e.target.value, searchType === 'all');
                    }}
                    className="mb-4"
                />
                <RadioGroup
                    value={searchType}
                    onValueChange={(value) => {
                        setSearchType(value);
                        onSearch(searchQuery, value === 'all');
                    }}
                    className="mb-4 flex space-x-2"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nameAndId" id="nameAndId"/>
                        <Label htmlFor="nameAndId">Name & ID</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all"/>
                        <Label htmlFor="all">All</Label>
                    </div>
                </RadioGroup>
                <ScrollArea className="h-[calc(100vh-200px)]">
                    <ul>
                        {items.map((item) => (
                            <li
                                key={getItemId(item)}
                                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                                onClick={() => onItemSelect(getItemId(item))}
                            >
                                {getItemName(item)}
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </div>
            <div
                className="absolute top-0 right-0 w-1 h-full bg-gray-300 cursor-col-resize"
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}
