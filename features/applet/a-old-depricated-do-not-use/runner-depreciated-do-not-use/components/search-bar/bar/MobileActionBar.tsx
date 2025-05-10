"use client";
import React from "react";
import { Search } from "lucide-react";

interface MobileActionBarProps {
    onClearAll: () => void;
    onSearch: () => void;
}

const MobileActionBar: React.FC<MobileActionBarProps> = ({ onClearAll, onSearch }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 flex justify-between items-center">
            <button 
                className="text-rose-600 dark:text-rose-400 font-medium"
                onClick={onClearAll}
            >
                Clear all
            </button>
            <button 
                className="bg-rose-600 text-white px-8 py-3 rounded-xl font-medium flex items-center"
                onClick={onSearch}
            >
                <Search size={18} className="mr-2" />
                Search
            </button>
        </div>
    );
};

export default MobileActionBar;