'use client';

import React, {useState} from 'react';
import {IconChevronRight} from "@tabler/icons-react";
import FeatureSectionAnimatedGradientComponents
    from "@/components/animated/my-custom-demos/feature-section-animated-gradient-component";
import FeatureSectionLinkComponent
    from "@/components/animated/my-custom-demos/feature-section-link-component";
import {useRouter} from "next/navigation";
import ErrorBoundary from "@/app/(authenticated)/admin/components/shared/ErrorBoundary";
import {adminCategories} from "@/app/(authenticated)/(admin-auth)/administration/categories";


// IMPORTANT: All features and routes are defined in: app\(authenticated)\(admin-auth)\administration\categories.tsx
// The top navigation menu automatically extracts routes from categories.tsx via config.ts

const AdminPage = () => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const router = useRouter();

    React.useEffect(() => {
        if (selectedCategory) {
            window.history.pushState(
                {
                    selectedCategory
                },
                '',
                window.location.pathname
            );
        }

        const handlePopState = (event: PopStateEvent) => {
            if (event.state === null) {
                setSelectedCategory(null);
            } else {
                setSelectedCategory(event.state.selectedCategory);
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [selectedCategory]);

    const handleSelectComponent = (title: string) => {
        const feature = adminCategories.flatMap(cat => cat.features).find(f => f.title === title);
        if (feature?.link) {
            router.push(feature.link);
        }
    };

    const handleSelectCategory = (name: string) => {
        setSelectedCategory(name);
    };

    const getPreviewFeatures = (features: any[]) => {
        if (features.length <= 3) return features;
        return features.slice(0, 3);
    };

    const getCategoryBgClass = (iconColor?: string) => {
        const colorMap: Record<string, string> = {
            'text-amber-600': 'bg-amber-100 dark:bg-amber-900/20',
            'text-blue-600': 'bg-blue-100 dark:bg-blue-900/20',
            'text-indigo-600': 'bg-indigo-100 dark:bg-indigo-900/20',
            'text-purple-600': 'bg-purple-100 dark:bg-purple-900/20',
            'text-green-600': 'bg-green-100 dark:bg-green-900/20',
            'text-cyan-600': 'bg-cyan-100 dark:bg-cyan-900/20',
            'text-pink-600': 'bg-pink-100 dark:bg-pink-900/20',
            'text-orange-600': 'bg-orange-100 dark:bg-orange-900/20',
            'text-red-600': 'bg-red-100 dark:bg-red-900/20',
            'text-teal-600': 'bg-teal-100 dark:bg-teal-900/20',
            'text-violet-600': 'bg-violet-100 dark:bg-violet-900/20',
        };
        return colorMap[iconColor || 'text-blue-600'] || 'bg-blue-100 dark:bg-blue-900/20';
    };
    if (selectedCategory) {
        const category = adminCategories.find(c => c.name === selectedCategory);
        return (
            <div className="h-full w-full overflow-auto">
                <div className="min-h-screen py-4 bg-neutral-100 dark:bg-neutral-900 w-full">
                    <div className="w-full px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category?.features.map((feature, index) => (
                            <FeatureSectionLinkComponent
                                key={feature.title}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                                index={index}
                                link={feature.link}
                                isNew={feature.isNew}
                            />
                        ))}
                    </div>
                </div>
            </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-auto">
            <div className="min-h-screen py-4 bg-neutral-100 dark:bg-neutral-900 w-full">
                <div className="w-full mx-2">
                <h1 className="text-xl font-bold text-center mb-4">Admin Dashboard Home</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {adminCategories.map((category, index) => (
                        <div
                            key={category.name}
                            onClick={() => handleSelectCategory(category.name)}
                            className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4
                                     transform transition-all duration-200 hover:scale-105 hover:shadow-xl
                                     cursor-pointer relative group"
                        >
                            <div className="flex items-center space-x-4 mb-4">
                                <div className={`p-3 rounded-lg ${category.iconColor || 'text-blue-600'} ${getCategoryBgClass(category.iconColor)}`}>
                                    {category.icon}
                                </div>
                                <h3 className="text-xl font-semibold">{category.name}</h3>
                            </div>
                            <div className="h-32 flex flex-col justify-between">
                                <div className="space-y-2">
                                    {getPreviewFeatures(category.features).map((feature) => (
                                        <div
                                            key={feature.title}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectComponent(feature.title);
                                            }}
                                            className={`flex items-center h-6 
                                                ${feature.isNew 
                                                    ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                                                    : 'text-gray-600 dark:text-gray-300'}
                                                hover:text-blue-700 dark:hover:text-blue-500
                                                cursor-pointer transition-colors duration-200`}
                                        >
                                            <div className="flex items-center min-w-[28px]">
                                                <div className="w-4 h-4">
                                                    {feature.icon}
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium">
                                                {feature.title}
                                                {feature.isNew && (
                                                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
                                                        New
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {category.features.length > 3 && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectCategory(category.name);
                                        }}
                                        className="flex items-center text-sm text-blue-600 dark:text-blue-400
                                                 hover:text-blue-800 dark:hover:text-blue-300
                                                 cursor-pointer transition-colors duration-200
                                                 mt-2 pl-7"
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
        </div>
    );
};

export default AdminPage;
