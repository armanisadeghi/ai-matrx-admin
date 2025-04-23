"use client";
import React from "react";
import Link from "next/link";
import { MessageSquare, Grid3X3, Database, Cpu, Image, PlusCircle, Search, Bell, ChevronRight, Zap, BarChart3, Clock } from "lucide-react";
import { MatrixFloatingMenu } from "@/components/layout/FloatingDock";
import { BACKGROUND_PATTERN } from "@/constants/chat";

const DashboardPage = () => {
    // Sample data for recent activity
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
    const quickAccess = [
        {
            id: 1,
            name: "Text Summarizer",
            description: "Condense long documents",
            icon: <MessageSquare size={20} className="text-purple-500 dark:text-purple-400" />,
        },
        {
            id: 2,
            name: "Image Generator",
            description: "Create custom visuals",
            icon: <Image size={20} className="text-green-500 dark:text-green-400" />,
        },
        {
            id: 3,
            name: "Data Analyzer",
            description: "Extract insights",
            icon: <BarChart3 size={20} className="text-blue-500 dark:text-blue-400" />,
        },
    ];

    return (
        <div className="flex flex-col h-full w-full">
            {/* Wrapper div that contains both the floating menu and the content */}
            <div 
                className="flex flex-col w-full h-full bg-zinc-100 dark:bg-zinc-850 text-gray-800 dark:text-gray-100"
                style={{ backgroundImage: BACKGROUND_PATTERN }}
            >
                {/* Floating menu - using the same background as the main content */}
                <div className="sticky top-0 z-50 bg-zinc-100 dark:bg-zinc-850">
                    <MatrixFloatingMenu />
                </div>
                
                {/* Main content - no margin or padding at the top to eliminate the gap */}
                <div className="container mx-auto px-6">
                    {/* Top bar with search and notifications */}
                    <div className="flex justify-between items-center mb-8 pt-6">
                        <h1 className="text-2xl font-bold">Dashboard</h1>
                        <div className="flex items-center space-x-4">
                            <div className="relative rounded-full flex items-center px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                                <Search size={18} className="text-gray-400 dark:text-gray-500 mr-2" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="bg-transparent border-none outline-none w-48 placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            </div>
                            <button className="p-2 rounded-full bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700">
                                <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>
                    </div>

                    {/* Main content grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main features section - spans 2 columns */}
                        <div className="lg:col-span-2">
                            <h2 className="text-lg font-semibold mb-4">Key Features</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {/* Chat Feature Card */}
                                <Link href="/chat" className="block">
                                    <div className="rounded-xl p-5 cursor-pointer transform transition hover:scale-105 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 shadow-md dark:shadow-zinc-800/20">
                                        <div className="flex flex-col items-center text-center space-y-3">
                                            <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/70">
                                                <MessageSquare size={28} className="text-indigo-500 dark:text-indigo-400" />
                                            </div>
                                            <h3 className="font-semibold text-lg">Chat</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Interact with our reimagined AI chat interface
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                                {/* Applets Feature Card */}
                                <Link href="/applets" className="block">
                                    <div className="rounded-xl p-5 cursor-pointer transform transition hover:scale-105 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 shadow-md dark:shadow-zinc-800/20">
                                        <div className="flex flex-col items-center text-center space-y-3">
                                            <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/70">
                                                <Grid3X3 size={28} className="text-emerald-500 dark:text-emerald-400" />
                                            </div>
                                            <h3 className="font-semibold text-lg">Applets</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Access various AI-integrated applications
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                                {/* Tables Feature Card */}
                                <Link href="/data" className="block">
                                    <div className="rounded-xl p-5 cursor-pointer transform transition hover:scale-105 bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-md dark:shadow-zinc-800/20">
                                        <div className="flex flex-col items-center text-center space-y-3">
                                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/70">
                                                <Database size={28} className="text-blue-500 dark:text-blue-400" />
                                            </div>
                                            <h3 className="font-semibold text-lg">Tables</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your custom data tables</p>
                                        </div>
                                    </div>
                                </Link>
                                {/* Cockpit Feature Card */}
                                <Link href="/ai/cockpit" className="block">
                                    <div className="rounded-xl p-5 cursor-pointer transform transition hover:scale-105 bg-white dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 shadow-md dark:shadow-zinc-800/20">
                                        <div className="flex flex-col items-center text-center space-y-3">
                                            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/70">
                                                <Cpu size={28} className="text-amber-500 dark:text-amber-400" />
                                            </div>
                                            <h3 className="font-semibold text-lg">Cockpit</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Build custom AI workflows</p>
                                        </div>
                                    </div>
                                </Link>
                                {/* Image Gallery Feature Card */}
                                <Link href="/image-editing/unsplash" className="block">
                                    <div className="rounded-xl p-5 cursor-pointer transform transition hover:scale-105 bg-white dark:bg-zinc-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 shadow-md dark:shadow-zinc-800/20">
                                        <div className="flex flex-col items-center text-center space-y-3">
                                            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/70">
                                                <Image size={28} className="text-purple-500 dark:text-purple-400" />
                                            </div>
                                            <h3 className="font-semibold text-lg">Image Gallery</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Browse your generated images</p>
                                        </div>
                                    </div>
                                </Link>
                                {/* Add New Feature Card */}
                                <div className="rounded-xl p-5 cursor-pointer border-2 border-dashed transition hover:border-opacity-100 border-gray-200 dark:border-zinc-700 border-opacity-70 hover:border-gray-300 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800">
                                    <div className="flex flex-col items-center text-center space-y-3 h-full justify-center">
                                        <div className="p-3 rounded-full bg-gray-100 dark:bg-zinc-700">
                                            <PlusCircle size={28} className="text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <h3 className="font-semibold text-lg">Add Feature</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Connect new functionality</p>
                                    </div>
                                </div>
                            </div>
                            {/* Quick Access Section */}
                            <h2 className="text-lg font-semibold mt-8 mb-4">Quick Access</h2>
                            <div className="rounded-xl p-2 bg-white dark:bg-zinc-800 shadow-md dark:shadow-zinc-800/20">
                                {quickAccess.map((app, index) => (
                                    <div
                                        key={app.id}
                                        className={`flex items-center justify-between p-4 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 ${
                                            index !== quickAccess.length - 1 ? "border-b border-gray-100 dark:border-zinc-700" : ""
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <div className="p-2 rounded-lg mr-4 bg-gray-100 dark:bg-zinc-700">{app.icon}</div>
                                            <div>
                                                <h3 className="font-medium">{app.name}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{app.description}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Sidebar content - stats and activity */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Usage stats */}
                            <div>
                                <h2 className="text-lg font-semibold mb-4">Usage Statistics</h2>
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
                                    <h2 className="text-lg font-semibold">Recent Activity</h2>
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
                                <h2 className="text-lg font-semibold mb-4">Recommended For You</h2>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-100 dark:border-indigo-800/50">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/70">
                                            <Zap size={18} className="text-indigo-500 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
                                            New
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1">Multi-Modal AI Assistant</h3>
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