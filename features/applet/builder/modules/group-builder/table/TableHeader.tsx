"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";

interface TableHeaderProps {
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCreateContainer: () => void;
}

export default function TableHeader({ searchTerm, onSearchChange, onCreateContainer }: TableHeaderProps) {
    return (
        <div className="flex items-center space-x-2">
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input 
                    placeholder="Search containers..." 
                    className="pl-8" 
                    value={searchTerm} 
                    onChange={onSearchChange} 
                />
            </div>
            <Button 
                onClick={onCreateContainer} 
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
            >
                <Plus className="h-4 w-4 mr-2" />
                New Container
            </Button>
        </div>
    );
}