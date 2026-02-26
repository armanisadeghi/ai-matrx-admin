"use client";

import React from "react";
import {
    Zap,
    BarChart3,
    Clock,
    Database,
    Cpu,
    MessageSquare,
    Brain,
    Settings,
    User,
    Building2,
    ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { Grid, CardProps, HorizontalCardProps, IosWidget } from "@/components/official/card-and-grid";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserStats } from "./user-stats-fetch";
import { FaTasks } from "react-icons/fa";
import Link from "next/link";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser, selectActiveUserName } from "@/lib/redux/selectors/userSelectors";
import { LatestAiModels } from "@/components/animated/ExpandableCards/ExpandableCardDemo";
import { dashboardLinks } from "@/constants/navigation-links";
import { SandboxWidget } from "./SandboxWidget";


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

    // Feature cards data from single source of truth
    const featureCards: CardProps[] = dashboardLinks
        .filter(link => link.href !== "/dashboard") // Exclude dashboard itself
        .map(link => ({
            title: link.label,
            description: link.description || "",
            icon: link.icon as React.ReactElement,
            color: (link.color || "gray") as CardProps["color"],
            path: link.href,
        }));

    // User settings cards
    const userSettingsCards: CardProps[] = [
        {
            title: "Profile",
            description: "View and edit your profile information",
            icon: <User />,
            color: "cyan",
            path: "/settings/profile",
        },
        {
            title: "Preferences",
            description: "Customize your app experience",
            icon: <Settings />,
            color: "orange",
            path: "/settings/preferences",
        },
        {
            title: "Organizations",
            description: "Manage your organizations and team collaboration",
            icon: <Building2 />,
            color: "blue",
            path: "/settings/organizations",
        },
    ];

    // ─── Mobile iOS Home Screen Layout ─────────────────────────────────────────
    if (isMobile) {
        return (
            <div className="flex flex-col h-page w-full overflow-hidden">
                <div className="flex flex-col w-full h-full bg-textured text-gray-800 dark:text-gray-100 h-full overflow-y-auto">
                    <div className="px-3 pt-3 pb-8">

                        {/* ── iOS Icon + Widget Grid ──────────────────────────────── */}
                        {/*
                         *  Layout strategy (4-column CSS grid with row heights):
                         *  Row 1-2: [icon][icon][  Widget A  ]   (widget spans col 3-4, row 1-2)
                         *  Row 1-2: [icon][icon][  Widget A  ]
                         *  Row 3:   [icon][icon][icon][icon]
                         *  …and so on for feature icons, then a second widget row
                         */}
                        <div
                            className="grid grid-cols-4 gap-x-2"
                            style={{ rowGap: "16px" }}
                        >
                            {/* First 2 icon columns (rows 1-2) — 4 icons stacked 2×2 */}
                            <div className="col-span-2 grid grid-cols-2 gap-x-2" style={{ rowGap: "16px" }}>
                                {featureCards.slice(0, 4).map((item, i) => (
                                    <IosAppIcon key={i} item={item} />
                                ))}
                            </div>

                            {/* Widget A — "Structured Plan" — cols 3-4, rows 1-2 */}
                            <IosWidget
                                title="Structured Plan & Task List"
                                description="Convert speech into a plan"
                                icon={<FaTasks />}
                                color="purple"
                                path="/chat"
                                badge="AI"
                            />

                            {/* Row 3-4: 4 icons, then Widget B */}
                            <div className="col-span-2 grid grid-cols-2 gap-x-2" style={{ rowGap: "16px" }}>
                                {featureCards.slice(4, 8).map((item, i) => (
                                    <IosAppIcon key={i} item={item} />
                                ))}
                            </div>

                            {/* Widget B — "Image Generator" — cols 3-4, rows 3-4 */}
                            <IosWidget
                                title="Image Generator"
                                description="Create custom visuals with AI"
                                icon={<ImageIcon />}
                                color="emerald"
                                path="/chat"
                                badge="New"
                            />

                            {/* Remaining feature icons — full 4-column rows */}
                            {featureCards.slice(8).map((item, i) => (
                                <IosAppIcon key={i} item={item} />
                            ))}

                            {/* ── Settings icons row ──────────────────────────────── */}
                            {userSettingsCards.map((item, i) => (
                                <IosAppIcon key={i} item={item} />
                            ))}
                        </div>

                        {/* ── Latest AI Models ────────────────────────────────────── */}
                        <div className="mt-6">
                            <h2 className="text-sm font-semibold mb-3 text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                                Latest AI Models
                            </h2>
                            <div className="rounded-[20px] border border-border overflow-hidden">
                                <LatestAiModels />
                            </div>
                        </div>

                        {/* ── New Features ────────────────────────────────────────── */}
                        <div className="mt-6">
                            <h2 className="text-sm font-semibold mb-3 text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                                New Features
                            </h2>
                            <div className="rounded-2xl bg-white dark:bg-zinc-800 shadow-sm overflow-hidden">
                                {recentActivity.map((activity, index) => (
                                    <div
                                        key={activity.id}
                                        className={`flex items-center gap-3 px-4 py-3 ${
                                            index !== recentActivity.length - 1 ? "border-b border-gray-100 dark:border-zinc-700" : ""
                                        }`}
                                    >
                                        <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-700 flex-shrink-0">
                                            {activity.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{activity.title}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Clock size={10} className="text-gray-400" />
                                                <span className="text-[10px] text-gray-400">{activity.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Stats ───────────────────────────────────────────────── */}
                        <div className="mt-6">
                            <h2 className="text-sm font-semibold mb-3 text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                                Stats
                            </h2>
                            <div className="grid grid-cols-3 gap-3">
                                {usageStats.map((stat) => (
                                    <div
                                        key={stat.id}
                                        className="rounded-2xl bg-white dark:bg-zinc-800 shadow-sm p-3 flex flex-col items-center text-center"
                                    >
                                        <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-700 mb-1">
                                            {stat.icon}
                                        </div>
                                        <span className="text-lg font-semibold leading-none">{stat.userCount}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{stat.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Sandbox ─────────────────────────────────────────────── */}
                        <div className="mt-6">
                            <SandboxWidget />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Desktop Layout (unchanged) ────────────────────────────────────────────
    return (
        <div className="flex flex-col h-page w-full overflow-hidden">
            {/* Wrapper div that contains both the floating menu and the content */}
            <div 
                className="flex flex-col w-full h-full bg-textured text-gray-800 dark:text-gray-100"
            >

                {/* Main content with fixed height and scrollable sections */}
                <div className={`w-full px-6 pt-4 h-full overflow-hidden`}>
                    {/* Main content grid */}
                    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 h-full`}>
                        {/* Main features section - spans 2 columns with independent scroll */}
                        <div className={`lg:col-span-2 overflow-y-auto scrollbar-none h-full pr-3 pb-8`}>
                            <Grid title="" items={featureCards} columns={4} compact={false} showAddButton={true} addButtonText="Add Feature" />

                            {/* Quick Access Section */}
                            <div className="mt-8 space-y-2 rounded-xl bg-white dark:bg-zinc-800 shadow-md dark:shadow-zinc-800/20 overflow-hidden">
                                {[
                                    { title: "Structured Plan & Task List", description: "Use an Adio file to convert your speech into a structured plan and a real task list", icon: <FaTasks />, color: "purple" as const, path: "/chat" },
                                    { title: "Image Generator", description: "Create custom visuals", icon: <ImageIcon />, color: "green" as const, path: "/chat" },
                                    { title: "Data Analyzer", description: "Extract insights", icon: <BarChart3 />, color: "blue" as const, path: "/chat" },
                                ].map((item, i, arr) => (
                                    <Link key={i} href={item.path} className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${i !== arr.length - 1 ? "border-b border-gray-100 dark:border-zinc-700" : ""}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/70 text-${item.color}-500`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{item.title}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                                            </div>
                                        </div>
                                        <span className="text-gray-400">›</span>
                                    </Link>
                                ))}
                            </div>

                            {/* User Settings and Recommended row */}
                            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* User Settings Section - 2 columns */}
                                <div className="lg:col-span-2">
                                    <Grid items={userSettingsCards} columns={4} compact={false} className="mt-2" />
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
                        <div className={`lg:col-span-1 overflow-y-auto scrollbar-none h-full pl-3 pb-8`}>
                            {/* User Profile Card */}
                            <div>
                                <div className="p-4 rounded-xl bg-white dark:bg-zinc-800 shadow-md dark:shadow-zinc-800/20">
                                    <div className="flex items-center mb-4">
                                        <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                                            {user.userMetadata.picture ? (
                                                <Image 
                                                    src={user.userMetadata.picture} 
                                                    alt="Profile" 
                                                    width={64}
                                                    height={64}
                                                    className="h-full w-full object-cover rounded-full" 
                                                />
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
                                        <Link href="/settings/profile">
                                            <div className="p-2 rounded-lg text-center bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 transition-colors text-cyan-700 dark:text-cyan-300 text-sm font-medium">
                                                Edit Profile
                                            </div>
                                        </Link>
                                        <Link href="/settings/preferences">
                                            <div className="p-2 rounded-lg text-center bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 transition-colors text-orange-700 dark:text-orange-300 text-sm font-medium">
                                                Preferences
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 border border-border rounded-3xl">
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
                            {/* Sandbox summary */}
                            <SandboxWidget />

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

// ─── Inline helper: renders a single iOS app icon cell ─────────────────────────
function IosAppIcon({ item }: { item: CardProps }) {
    const iosIconBg: Record<string, string> = {
        indigo: "bg-indigo-600", emerald: "bg-emerald-600", blue: "bg-blue-600",
        amber: "bg-amber-500", purple: "bg-purple-700", gray: "bg-zinc-600",
        red: "bg-red-600", green: "bg-green-600", yellow: "bg-yellow-500",
        pink: "bg-pink-600", orange: "bg-orange-500", teal: "bg-teal-600",
        cyan: "bg-cyan-600", lime: "bg-lime-600", rose: "bg-rose-600",
        violet: "bg-violet-700", slate: "bg-slate-600",
    };
    const bg = iosIconBg[item.color] ?? "bg-zinc-600";

    const inner = (
        <div className="flex flex-col items-center gap-[6px] cursor-pointer select-none">
            <div className={`w-full aspect-square rounded-[22%] ${bg} flex items-center justify-center shadow-sm active:opacity-75 transition-opacity`}>
                {React.cloneElement(item.icon as React.ReactElement<{ size?: number; className?: string }>, {
                    className: "text-white",
                    size: 26,
                })}
            </div>
            <span className="text-[10.5px] font-medium text-center leading-tight text-foreground w-full truncate">
                {item.title}
            </span>
        </div>
    );

    if (item.path) {
        return <Link href={item.path} className="block">{inner}</Link>;
    }
    return <div>{inner}</div>;
}

export default DashboardPage;
