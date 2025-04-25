"use client";

import React from "react";
import { MessageSquare, Grid3X3, Database, Cpu, Image, PlusCircle, Search, Bell, ChevronRight, Zap, BarChart3, Clock } from "lucide-react";
import { MatrixFloatingMenu } from "@/components/layout/MatrixFloatingMenu";
import { BACKGROUND_PATTERN } from "@/constants/chat";
import { Card, Grid, CardProps, HorizontalCard, HorizontalCardProps, List } from "@/components/official/card-and-grid";
import { useIsMobile } from "@/hooks/use-mobile";

const DashboardPage = () => {
    const isMobile = useIsMobile();

    const recentActivity = [
        { id: 1, title: "New AI model deployed", time: "2 hours ago", icon: <Zap size={16} /> },
        { id: 2, title: "Data import completed", time: "Yesterday", icon: <Database size={16} /> },
        { id: 3, title: "Custom workflow created", time: "2 days ago", icon: <Cpu size={16} /> },
    ];
    // Sample data for usage statistics
    const usageStats = [
        { id: 1, name: "Chat Sessions", value: 342, change: "+12%", icon: <MessageSquare size={18} /> },
        { id: 2, name: "Workflows Created", value: 56, change: "+8%", icon: <Cpu size={18} /> },
        { id: 3, name: "Images Generated", value: 128, change: "+24%", icon: <Image size={18} /> },
    ];
    // Sample data for quick access apps
    const quickAccessItems: HorizontalCardProps[] = [
        {
            title: "Text Summarizer",
            description: "Condense long documents",
            icon: <MessageSquare />,
            color: "purple",
            path: "/apps/text-summarizer",
        },
        {
            title: "Image Generator",
            description: "Create custom visuals",
            icon: <Image />,
            color: "green",
            path: "/apps/image-generator",
        },
        {
            title: "Data Analyzer",
            description: "Extract insights",
            icon: <BarChart3 />,
            color: "blue",
            path: "/apps/data-analyzer",
        },
    ];

    // Feature cards data
    const featureCards: CardProps[] = [
        {
            title: "Chat",
            description: "Interact with our reimagined AI chat interface",
            icon: <MessageSquare />,
            color: "indigo",
            path: "/chat",
        },
        {
            title: "Cockpit",
            description: "Build custom AI workflows",
            icon: <Cpu />,
            color: "amber",
            path: "/ai/cockpit",
        },
        {
            title: "Applets",
            description: "Brows a collection of Applets built by the community",
            icon: <Grid3X3 />,
            color: "emerald",
            path: "/applets",
        },
        {
            title: "Tables",
            description: "Manage your custom data tables or create new ones in a Chat",
            icon: <Database />,
            color: "blue",
            path: "/data",
        },
        {
            title: "Image Gallery",
            description: "Browse a collection of images you can use in your projects",
            icon: <Image />,
            color: "purple",
            path: "/image-editing/unsplash",
        },
    ];

    return (
        <div className="flex flex-col h-full w-full">
            {/* Wrapper div that contains both the floating menu and the content */}
            <div
                className="flex flex-col w-full h-full bg-zinc-100 dark:bg-zinc-850 text-gray-800 dark:text-gray-100 pt-7"
                style={{ backgroundImage: BACKGROUND_PATTERN }}
            >
                {/* Floating menu - using the same background as the main content */}
                <div className="sticky top-0 z-50 bg-zinc-100 dark:bg-zinc-850">
                    <MatrixFloatingMenu />
                </div>

                {/* Main content - no margin or padding at the top to eliminate the gap */}
                <div className="container mx-auto px-6">
                    {/* Main content grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main features section - spans 2 columns */}
                        <div className="lg:col-span-2">
                            <Grid
                                title="Experimental Features"
                                items={featureCards}
                                columns={3}
                                showAddButton
                                addButtonText="Add Feature"
                            />

                            {/* Quick Access Section */}
                            <List
                                title="Quick Access (Not implemented)"
                                items={quickAccessItems}
                                className="mt-8"
                                containerClassName="p-2"
                            />
                        </div>
                        {/* Sidebar content - stats and activity */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Usage stats */}
                            <div>
                                <h2 className="text-md font-semibold mb-4">Usage Statistics (Not implemented)</h2>
                                <div className="rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-md dark:shadow-zinc-800/20">
                                    {usageStats.map((stat, index) => (
                                        <div
                                            key={stat.id}
                                            className={`flex items-center p-4 ${
                                                index !== usageStats.length - 1 ? "border-b border-gray-100 dark:border-zinc-700" : ""
                                            }`}
                                        >
                                            <div className="p-2 rounded-lg mr-4 bg-gray-100 dark:bg-zinc-700">{stat.icon}</div>
                                            <div className="flex-1">
                                                <h3 className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</h3>
                                                <div className="flex items-baseline">
                                                    <span className="text-xl font-semibold mr-2">{stat.value}</span>
                                                    <span
                                                        className={`text-xs ${
                                                            stat.change.startsWith("+")
                                                                ? "text-green-500 dark:text-green-400"
                                                                : "text-red-500 dark:text-red-400"
                                                        }`}
                                                    >
                                                        {stat.change}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Recent activity */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-md font-semibold">Recent Activity (Not implemented)</h2>
                                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                                        View all
                                    </button>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-zinc-800 shadow-md dark:shadow-zinc-800/20">
                                    {recentActivity.map((activity, index) => (
                                        <div
                                            key={activity.id}
                                            className={`flex items-start p-4 ${
                                                index !== recentActivity.length - 1 ? "border-b border-gray-100 dark:border-zinc-700" : ""
                                            }`}
                                        >
                                            <div className="p-2 rounded-lg mr-4 flex-shrink-0 bg-gray-100 dark:bg-zinc-700">
                                                {activity.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-medium">{activity.title}</h3>
                                                <div className="flex items-center mt-1">
                                                    <Clock size={12} className="text-gray-400 dark:text-gray-500" />
                                                    <span className="text-xs ml-1 text-gray-400 dark:text-gray-500">{activity.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Recommendations */}
                            <div>
                                <h2 className="text-md font-semibold mb-4">Recommended For You (Not implemented)</h2>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-100 dark:border-indigo-800/50">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/70">
                                            <Zap size={18} className="text-indigo-500 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
                                            New
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-md mb-1">Multi-Modal AI Assistant</h3>
                                    <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
                                        Process text, images, and data with our newest AI model.
                                    </p>
                                    <button className="w-full py-2 rounded-lg font-medium text-center transition bg-indigo-500 hover:bg-indigo-600 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700">
                                        Try Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add bottom padding/margin for spacing */}
                    <div className="pb-8"></div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
