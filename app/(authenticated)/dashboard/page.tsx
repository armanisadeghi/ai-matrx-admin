"use client";

import React from "react";
import {
    MessageSquare,
    Grid3X3,
    Database,
    Cpu,
    Image,
    Zap,
    BarChart3,
    Clock,
    Brain,
    Settings,
    User,
    FileText,
    Workflow,
    Scissors,
} from "lucide-react";
import { Grid, CardProps, HorizontalCardProps, List } from "@/components/official/card-and-grid";
import { useIsMobile } from "@/hooks/use-mobile";
import { AiFillAudio } from "react-icons/ai";
import { useUserStats } from "./user-stats-fetch";
import { FaTasks } from "react-icons/fa";
import Link from "next/link";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser, selectActiveUserName } from "@/lib/redux/selectors/userSelectors";
import { LatestAiModels } from "@/components/animated/ExpandableCards/ExpandableCardDemo";


const DashboardPage = () => {
    const isMobile = useIsMobile();
    const { stats } = useUserStats();
    const user = useAppSelector(selectUser);
    const displayName = useAppSelector(selectActiveUserName);

    const recentActivity = [
        { id: 1, title: "New GPT 5 Models Deployed", time: "This week", icon: <Zap size={16} /> },
        { id: 2, title: "HTML live preview in Chat & Applets", time: "This week", icon: <Database size={16} /> },
        { id: 3, title: "Questionnaire mode now available in Chat", time: "3 days ago", icon: <Cpu size={16} /> },
        { id: 4, title: "New Claude 4.5 Sonnet Model Deployed", time: "2 days ago", icon: <Cpu size={16} /> },
    ];
    // Sample data for usage statistics
    const usageStats = [
        {
            id: 1,
            name: "Chats",
            userCount: stats?.user_conversation_count || 0,
            totalCount: stats?.total_conversation_count || 0,
            icon: <MessageSquare size={18} />,
        },
        {
            id: 2,
            name: "Recipes",
            userCount: stats?.user_recipe_count || 0,
            totalCount: stats?.total_recipe_count || 0,
            icon: <Brain size={18} />,
        },
        {
            id: 3,
            name: "Tables",
            userCount: stats?.user_tables_count || 0,
            totalCount: stats?.total_tables_count || 0,
            icon: <Database size={18} />,
        },
    ];
    // Sample data for quick access apps
    const quickAccessItems: HorizontalCardProps[] = [
        {
            title: "Structured Plan & Task List",
            description: "Use an Adio file to convert your speech into a structured plan and a real task list",
            icon: <FaTasks />,
            color: "purple",
            path: "/chat",
        },
        {
            title: "Image Generator",
            description: "Create custom visuals",
            icon: <Image />,
            color: "green",
            path: "/chat",
        },
        {
            title: "Data Analyzer",
            description: "Extract insights",
            icon: <BarChart3 />,
            color: "blue",
            path: "/chat",
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
            description: "Build Custom AI Agents & Recipes without code!",
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
            description: "Manage your custom data or create tables in a Chat",
            icon: <Database />,
            color: "blue",
            path: "/data",
        },
        {
            title: "Voices",
            description: "Browse a collection of voices you can use in your projects",
            icon: <AiFillAudio />,
            color: "purple",
            path: "/demo/voice/voice-manager",
        },
        {
            title: "Image Gallery",
            description: "Browse a collection of images you can use in your projects",
            icon: <Image />,
            color: "rose",
            path: "/image-editing/public-image-search",
        },
        {
            title: "Prompts",
            description: "Create and manage AI prompts for better interactions",
            icon: <FileText />,
            color: "teal",
            path: "/ai/prompts",
        },
        {
            title: "Workflow",
            description: "Design and automate complex workflows",
            icon: <Workflow />,
            color: "purple",
            path: "/workflow",
        },
        {
            title: "Scraper",
            description: "Extract and process data from web sources",
            icon: <Scissors />,
            color: "amber",
            path: "/scraper",
        },
    ];

    // User settings cards
    const userSettingsCards: CardProps[] = [
        {
            title: "Profile",
            description: "View and edit your profile information",
            icon: <User />,
            color: "cyan",
            path: "/dashboard/profile",
        },
        {
            title: "Preferences",
            description: "Customize your app experience",
            icon: <Settings />,
            color: "orange",
            path: "/dashboard/preferences",
        },
    ];

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Wrapper div that contains both the floating menu and the content */}
            <div 
                className="flex flex-col w-full h-full bg-textured text-gray-800 dark:text-gray-100"
            >

                {/* Main content with fixed height and scrollable sections */}
                <div className={`w-full ${isMobile ? 'px-3' : 'px-6'} pt-4 ${isMobile ? 'h-full overflow-y-auto' : 'h-[calc(100vh-64px)] overflow-hidden'}`}>
                    {/* Main content grid */}
                    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isMobile ? '' : 'h-full'}`}>
                        {/* Main features section - spans 2 columns with independent scroll */}
                        <div className={`lg:col-span-2 ${!isMobile ? 'overflow-y-auto scrollbar-none h-full' : ''} ${isMobile ? 'pr-0' : 'pr-3'} pb-8`}>
                            <Grid title="" items={featureCards} columns={isMobile ? 2 : 4} showAddButton addButtonText="Add Feature" />

                            {/* Quick Access Section */}
                            <List title="" items={quickAccessItems} className="mt-8" containerClassName={`${isMobile ? 'p-0' : 'p-2'}`} />

                            {/* User Settings and Recommended row */}
                            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* User Settings Section - 2 columns */}
                                <div className="lg:col-span-2">
                                    <Grid items={userSettingsCards} columns={isMobile ? 2 : 4} className="mt-2" />
                                </div>
                                
                                {/* Moved Recommendations - 1 column */}
                                <div className="lg:col-span-1">
                                    <h2 className="text-md font-semibold mb-4">Recommended</h2>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-100 dark:border-indigo-800/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/70">
                                                <FaTasks size={18} className="text-indigo-500 dark:text-indigo-400" />
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
                                                Advanced Workflow
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-md mb-1">Structured Plan & Task List</h3>
                                        <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
                                            Use an Adio file to convert your speech into a structured plan and a real task list
                                        </p>
                                        <Link href="/chat">
                                            <button className="w-full py-2 rounded-lg font-medium text-center transition bg-indigo-500 hover:bg-indigo-600 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700">
                                                Try Now
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Sidebar content - stats and activity with independent scroll */}
                        <div className={`lg:col-span-1 ${!isMobile ? 'overflow-y-auto scrollbar-none h-full' : ''} ${isMobile ? 'pl-0' : 'pl-3'} pb-8`}>
                            {/* Mobile divider */}
                            {isMobile && (
                                <div className="w-full my-8">
                                    <div className="flex items-center">
                                        <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
                                        <span className="px-4 font-medium text-gray-600 dark:text-gray-400">Your Profile</span>
                                        <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
                                    </div>
                                </div>
                            )}
                            
                            {/* User Profile Card */}
                            <div>
                                <div className="p-4 rounded-xl bg-white dark:bg-zinc-800 shadow-md dark:shadow-zinc-800/20">
                                    <div className="flex items-center mb-4">
                                        <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                                            {user.userMetadata.picture ? (
                                                <img src={user.userMetadata.picture} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                <User size={32} className="text-gray-400 dark:text-gray-500" />
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="font-semibold text-lg">{displayName || "User"}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Link href="/dashboard/profile">
                                            <div className="p-2 rounded-lg text-center bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 transition-colors text-cyan-700 dark:text-cyan-300 text-sm font-medium">
                                                Edit Profile
                                            </div>
                                        </Link>
                                        <Link href="/dashboard/preferences">
                                            <div className="p-2 rounded-lg text-center bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 transition-colors text-orange-700 dark:text-orange-300 text-sm font-medium">
                                                Preferences
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 border border-gray-200 dark:border-zinc-700 rounded-3xl">
                                <LatestAiModels />
                            </div>
                            {/* Recent activity */}
                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-md font-semibold">New Features</h2>
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
                            {/* Usage stats */}
                            <div className="mt-6">
                                <h2 className="text-md font-semibold mb-4">Stats</h2>
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
                                                <h3 className="text-sm text-gray-500 dark:text-gray-400">Your {stat.name}</h3>
                                                <div className="flex items-baseline">
                                                    <span className="text-xl font-semibold mr-2">{stat.userCount}</span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        Community: {stat.totalCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
