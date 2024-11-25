'use client';

import { Search, Save, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {FloatingInput, FloatingTextarea, FloatingSelect} from './FloatingLabelComponents';



const Page = () => {
    const [searchValue, setSearchValue] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');

    return (
        <div className="space-y-6 p-4 max-w-2xl mx-auto">
            {/* Input with icon */}
            <FloatingInput
                label="Search"
                rightElement={<Search className="h-4 w-4 text-muted-foreground" />}
                value={searchValue}
                onChange={setSearchValue}
            />

            {/* Textarea with save button */}
            <FloatingTextarea
                label="Description"
                rightElement={<Save className="h-4 w-4 text-muted-foreground cursor-pointer" />}
                value={description}
                onChange={setDescription}
                rows={6}
            />

            {/* Select with custom icon */}
            <FloatingSelect
                label="Category"
                options={[
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                ]}
                value={category}
                onChange={setCategory}
                rightElement={<ChevronDown className="h-4 w-4 text-muted-foreground" />}
            />
        </div>
    );
};

export default Page;
