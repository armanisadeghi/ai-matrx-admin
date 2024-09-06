// File Location: components/matrx/mobile-menu/index.tsx

import React, {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {MatrxInput} from '@/components/matrx/input';

interface MatrxMobileMenuProps<T> {
    items: T[];
    getItemId: (item: T) => string;
    getItemName: (item: T) => string;
    onItemSelect: (id: string) => void;
    onSearch: (query: string) => void;
}

export function MatrxMobileMenu<T>(
    {
        items,
        getItemId,
        getItemName,
        onItemSelect,
        onSearch,
    }: MatrxMobileMenuProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = items.filter((item) =>
        getItemName(item).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative w-full">
            <button
                className="w-full p-2 bg-background text-foreground border border-input rounded-md flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>Select an item</span>
                <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-background border border-input rounded-md shadow-lg">
                    <MatrxInput
                        type="search"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            onSearch(e.target.value);
                        }}
                        className="m-2"
                    />
                    <ul className="max-h-60 overflow-auto">
                        {filteredItems.map((item) => (
                            <li
                                key={getItemId(item)}
                                className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={() => {
                                    onItemSelect(getItemId(item));
                                    setIsOpen(false);
                                }}
                            >
                                {getItemName(item)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
