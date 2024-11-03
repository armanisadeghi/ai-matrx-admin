'use client';

import React, {useState} from 'react';
import {    IconGitBranch,     IconChevronRight} from "@tabler/icons-react";
import FeatureSectionAnimatedGradientComponents
    from "@/components/animated/my-custom-demos/feature-section-animated-gradient-component";
import {adminCategories} from "@/app/(authenticated)/admin/file-system/categories";
import {useRouter} from "next/navigation";

const AdminPage = () => {
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const router = useRouter();

    React.useEffect(() => {
        if (selectedComponent || selectedCategory) {
            window.history.pushState(
                {
                    selectedComponent,
                    selectedCategory
                },
                '',
                window.location.pathname
            );
        }

            // Handle popstate (back/forward button)
        const handlePopState = (event: PopStateEvent) => {
            if (event.state === null) {
                // User hit back and there's no state - go to root
                setSelectedComponent(null);
                setSelectedCategory(null);
            } else {
                // Restore the previous state
                setSelectedComponent(event.state.selectedComponent);
                setSelectedCategory(event.state.selectedCategory);
            }
        };

        window.addEventListener('popstate', handlePopState);

        // Cleanup
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [selectedComponent, selectedCategory]);

    const handleSelectComponent = (title: string) => {
        setSelectedComponent(title);
    };

    const handleSelectCategory = (name: string) => {
        setSelectedCategory(name);
    };
    const getPreviewFeatures = (features: any[]) => {
        if (features.length <= 3) return features;
        return features.slice(0, 3);
    };

    const handleBackToSelection = () => {
        if (selectedComponent) {
            // If we're in a component, go back to category
            setSelectedComponent(null);
            window.history.pushState(
                { selectedCategory, selectedComponent: null },
                '',
                window.location.pathname
            );
        } else if (selectedCategory) {
            // If we're in a category, go back to root
            setSelectedCategory(null);
            window.history.pushState(
                { selectedCategory: null, selectedComponent: null },
                '',
                window.location.pathname
            );
        }
    };

    if (selectedComponent) {
        const selectedFeature = adminCategories
            .flatMap(cat => cat.features)
            .find(f => f.title === selectedComponent);


        return (
            <div className="min-h-screen py-20 lg:py-40 bg-neutral-100 dark:bg-neutral-900">
                <div className="max-w-full mx-2">
                    <button
                        onClick={handleBackToSelection}
                        className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <IconGitBranch className="mr-2 w-4 h-4"/> Back to Selection
                    </button>
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold mb-4">{selectedComponent}</h2>
                        {selectedFeature?.component}
                    </div>
                </div>
            </div>
        );
    }

    if (selectedCategory) {
        const category = adminCategories.find(c => c.name === selectedCategory);
        return (
            <div className="min-h-screen py-20 lg:py-40 bg-neutral-100 dark:bg-neutral-900">
                <div className="max-w-7xl mx-auto px-4">
                    <button
                        onClick={handleBackToSelection}
                        className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <IconGitBranch className="mr-2 w-4 h-4"/> Back to Categories
                    </button>
                    <h2 className="text-3xl font-bold mb-8">{selectedCategory}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {category?.features.map((feature, index) => (
                            <FeatureSectionAnimatedGradientComponents
                                key={feature.title}
                                {...feature}
                                index={index}
                                onClick={() => handleSelectComponent(feature.title)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 bg-neutral-100 dark:bg-neutral-900">
            <div className="max-w-full mx-2">
                <h1 className="text-4xl font-bold text-center mb-8">Admin Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {adminCategories.map((category, index) => (
                        <div
                            key={category.name}
                            onClick={() => handleSelectCategory(category.name)}
                            className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6
                                     transform transition-all duration-200 hover:scale-105 hover:shadow-xl
                                     cursor-pointer relative group"
                        >
                            {/* Header Section */}
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                    {category.icon}
                                </div>
                                <h3 className="text-xl font-semibold">{category.name}</h3>
                            </div>

                            {/* Features Preview Section - Fixed Height */}
                            <div className="h-32 flex flex-col justify-between">
                                <div className="space-y-3">
                                    {getPreviewFeatures(category.features).map((feature) => (
                                        <div
                                            key={feature.title}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectComponent(feature.title);
                                            }}
                                            className="flex items-center h-6 text-gray-600 dark:text-gray-300
                                                     hover:text-blue-600 dark:hover:text-blue-400
                                                     cursor-pointer transition-colors duration-200
                                                     relative z-10 group"
                                        >
                                            <div className="flex items-center min-w-[28px]">
                                                <div className="w-4 h-4">
                                                    {feature.icon}
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium">{feature.title}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* "See all" link if there are more features */}
                                {category.features.length > 3 && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectCategory(category.name);
                                        }}
                                        className="flex items-center text-sm text-blue-600 dark:text-blue-400
                                                 hover:text-blue-800 dark:hover:text-blue-300
                                                 cursor-pointer transition-colors duration-200
                                                 mt-2 relative z-10 pl-7"
                                    >
                                        <span>See all {category.features.length} features</span>
                                        <IconChevronRight className="w-4 h-4 ml-1"/>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
