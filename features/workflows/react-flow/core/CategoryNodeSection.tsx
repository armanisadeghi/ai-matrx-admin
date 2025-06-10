"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface CategoryDefinition {
    id: string;
    icon: LucideIcon;
    label: string;
}

interface CategoryNodeSectionProps {
    categories: CategoryDefinition[];
    onCategoryClick: (categoryId: string) => void;
    columns?: number;
}

const CategoryNodeSection: React.FC<CategoryNodeSectionProps> = ({
    categories,
    onCategoryClick,
    columns = 2,
}) => {
    return (
        <div className="px-4 pb-4">
            <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {categories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                        <button
                            key={category.id}
                            onClick={() => onCategoryClick(category.id)}
                            className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                            <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-xs text-gray-700 dark:text-gray-300">{category.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CategoryNodeSection; 