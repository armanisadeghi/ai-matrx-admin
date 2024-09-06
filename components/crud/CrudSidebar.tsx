import React, {useState} from 'react';
import {MatrxInput} from '@/components/matrx/input';
import {MatrxRadioGroup} from '@/components/matrx/radio';
import {MatrxScrollArea} from '@/components/matrx/scroll-area';
import {DraggableSidebar} from "@/components/matrx/dragable-sidebar";
import {MatrixHoverTooltip} from "@/components/matrx/hover-tooltip";

interface CrudSidebarProps {
    allIdAndNames: { id: string; name: string }[];
    onItemSelect: (id: string) => void;
    onSearch: (query: string, searchAll: boolean) => void;
    isMobile: boolean;
}

export function CrudSidebar(
    {
        allIdAndNames,
        onItemSelect,
        onSearch,
        isMobile,
    }: CrudSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('nameAndId');

    const filteredItems = allIdAndNames.filter((item) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            item.name.toLowerCase().includes(searchLower) ||
            item.id.toLowerCase().includes(searchLower)
        );
    });

    const content = (
        <div className="p-4" style={{minWidth: '175px'}}>
            <MatrxInput
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    onSearch(value, searchType === 'all');
                }}
                className="transition-all duration-300"
            />
            <MatrxRadioGroup
                options={[
                    {value: 'nameAndId', label: 'Name & ID'},
                    {value: 'all', label: 'All'},
                ]}
                value={searchType}
                onValueChange={(value) => {
                    setSearchType(value);
                    onSearch(searchQuery, value === 'all');
                }}
                className="transition-all duration-300"
            />
            <MatrxScrollArea>
                <ul>
                    {filteredItems.map((item) => (
                        <li
                            key={item.id}
                            className="cursor-pointer hover:bg-accent hover:text-accent-foreground p-2 rounded transition-colors duration-200"
                            onClick={() => onItemSelect(item.id)}
                        >
                            <MatrixHoverTooltip
                                content={
                                    <>
                                        <div><strong>Name:</strong> {item.name}</div>
                                        <div><strong>ID:</strong> {item.id}</div>
                                    </>
                                }
                            >
                                {item.name}
                            </MatrixHoverTooltip>
                        </li>
                    ))}
                </ul>
            </MatrxScrollArea>
        </div>
    );

    return (
        <DraggableSidebar isMobile={isMobile}>
            {content}
        </DraggableSidebar>
    );
}
