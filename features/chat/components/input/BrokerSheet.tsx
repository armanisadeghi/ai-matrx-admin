"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, X, CheckSquare, Square, ChevronDown, ChevronUp, Filter } from "lucide-react";
import FloatingSheet from "@/components/ui/matrx/FloatingSheet";
import { allInformationBrokers, InformationBroker } from "./constants";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { useAppDispatch, useAppSelector } from "@/lib/redux";


interface BrokerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onBrokerSelectionChange?: (selectedBrokerIds: string[]) => void;
    isMobile?: boolean;
}

const extractCategories = (brokers: InformationBroker[]): string[] => {
    const categories = new Set(brokers.map((broker) => broker.category));
    return Array.from(categories).sort();
};

const BrokerSheet: React.FC<BrokerSheetProps> = ({ isOpen, onClose, onBrokerSelectionChange, isMobile }) => {
    const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [showCategories, setShowCategories] = useState(true);
    const dispatch = useAppDispatch();

    
    const {
        chatActions,
        chatSelectors,
        messageKey,
    } = useChatBasics();

    const availableBrokers = useAppSelector(chatSelectors.availableBrokers);

    const categories = useMemo(() => extractCategories(allInformationBrokers), []);

    useEffect(() => {
        setSelectedBrokers(availableBrokers || []);
    }, []);

    useEffect(() => {
        dispatch(chatActions.updateAvailableBrokers({ value: selectedBrokers }));
        onBrokerSelectionChange?.(selectedBrokers);
    }, [selectedBrokers]);

    const filteredBrokers = useMemo(() => {
        return allInformationBrokers.filter((broker) => {
            const matchesSearch =
                searchQuery === "" ||
                broker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                broker.description.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = activeCategory === null || broker.category === activeCategory;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory]);

    const brokersByCategory = useMemo(() => {
        const grouped: Record<string, InformationBroker[]> = {};

        filteredBrokers.forEach((broker) => {
            if (!grouped[broker.category]) {
                grouped[broker.category] = [];
            }
            grouped[broker.category].push(broker);
        });

        return grouped;
    }, [filteredBrokers]);

    const toggleBroker = (brokerId: string) => {
        setSelectedBrokers((prev) => {
            const newSelection = prev.includes(brokerId) ? prev.filter((id) => id !== brokerId) : [...prev, brokerId];

            return newSelection;
        });
    };

    const toggleCategory = (category: string) => {
        const brokersInCategory = allInformationBrokers.filter((broker) => broker.category === category).map((broker) => broker.id);

        const allSelected = brokersInCategory.every((id) => selectedBrokers.includes(id));

        setSelectedBrokers((prev) => {
            let newSelection;

            if (allSelected) {
                newSelection = prev.filter((id) => !brokersInCategory.includes(id));
            } else {
                const toAdd = brokersInCategory.filter((id) => !prev.includes(id));
                newSelection = [...prev, ...toAdd];
            }

            return newSelection;
        });
    };

    const selectAll = () => {
        const allBrokerIds = allInformationBrokers.map((broker) => broker.id);
        setSelectedBrokers(allBrokerIds);
    };

    const deselectAll = () => {
        setSelectedBrokers([]);
    };

    const clearFilters = () => {
        setSearchQuery("");
        setActiveCategory(null);
    };

    const Footer = (
        <div className="flex justify-between items-center pb-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
                {selectedBrokers.length} of {allInformationBrokers.length} brokers selected
            </div>
            <div className="flex space-x-2">
                <button
                    onClick={onClose}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    Cancel
                </button>
                <button onClick={onClose} className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Apply
                </button>
            </div>
        </div>
    );


    
    return (
        <FloatingSheet
            isOpen={isOpen}
            onClose={onClose}
            position="right"
            width="sm"
            title="Information Brokers"
            description="Add dynamic Information Brokers"
            footer={Footer}
            contentClassName="p-0"
            isMobile={isMobile}
        >
            <div className="flex flex-col h-full">
                {/* Search Bar */}
                <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <Search size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Brokers..."
                            className="block w-full pl-9 pr-9 py-1.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-zinc-100 dark:bg-zinc-850 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-zinc-500 text-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                                <X size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-zinc-100 dark:bg-zinc-850">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setShowCategories(!showCategories)}
                                className="flex items-center space-x-1 text-xs font-medium text-gray-700 dark:text-gray-200"
                            >
                                <Filter size={14} />
                                <span>Categories</span>
                                {showCategories ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {activeCategory && (
                                <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-xs">
                                    <span>{activeCategory}</span>
                                    <button onClick={() => setActiveCategory(null)}>
                                        <X size={12} />
                                    </button>
                                </div>
                            )}

                            {(searchQuery || activeCategory) && (
                                <button onClick={clearFilters} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                    Clear filters
                                </button>
                            )}
                        </div>

                        <div className="flex items-center space-x-3">
                            <button onClick={selectAll} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                Select all
                            </button>
                            <button onClick={deselectAll} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Category Filters */}
                    {showCategories && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                                    className={`px-2 py-0.5 rounded-md text-xs ${
                                        activeCategory === category
                                            ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tools List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredBrokers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
                            <Search size={36} className="text-gray-300 dark:text-gray-600 mb-3" />
                            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">No tools found</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
                            <button
                                onClick={clearFilters}
                                className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {/* If showing by category */}
                            {Object.entries(brokersByCategory).map(([category, brokers]) => (
                                <div key={category}>
                                    <div
                                        className="px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 sticky top-0 bg-zinc-50 dark:bg-zinc-700 z-10"
                                        onClick={() => toggleCategory(category)}
                                    >
                                        <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{category}</h3>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {brokers.filter((broker) => selectedBrokers.includes(broker.id)).length} of {brokers.length} selected
                                        </div>
                                    </div>

                                    <div>
                                        {brokers.map((broker) => (
                                            <div
                                                key={broker.id}
                                                className="px-4 py-2 flex items-start hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                                onClick={() => toggleBroker(broker.id)}
                                            >
                                                <div className="mr-2 mt-0.5 flex-shrink-0">
                                                    {selectedBrokers.includes(broker.id) ? (
                                                        <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
                                                    ) : (
                                                        <Square size={18} className="text-gray-400" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center">
                                                        <span className="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                            {broker.icon}
                                                        </span>
                                                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                                            {broker.name}
                                                        </h4>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                        {broker.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </FloatingSheet>
    );
};

export default BrokerSheet;
