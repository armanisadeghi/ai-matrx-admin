'use client';

import React, { useState } from 'react';
import { GridLayout, DashboardArea, type GridItem } from './GridLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    LayoutDashboard,
    LineChart,
    BarChart,
    PieChart,
    Users,
    Settings,
    Bell,
    Calendar,
    Mail
} from 'lucide-react';

// Demo components for different sections
const StatCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: any }) => (
    <DashboardArea className="flex items-center justify-between p-6">
        <div>
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="text-2xl font-bold">{value}</div>
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
    </DashboardArea>
);

const Chart = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <DashboardArea className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h3 className="font-medium">{title}</h3>
            <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
            Chart Placeholder
        </div>
    </DashboardArea>
);

const ActivityFeed = () => (
    <DashboardArea>
        <h3 className="font-medium mb-4">Recent Activity</h3>
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm">User action {i}</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                </div>
            ))}
        </div>
    </DashboardArea>
);

const Page = () => {
    const [layout, setLayout] = useState<'dashboard' | 'analytics' | 'compact'>('dashboard');

    // Different layout configurations
    const layouts = {
        dashboard: [
            // Header spanning full width
            {
                id: 'header',
                position: { startCol: 1, endCol: 5, startRow: 1 },
                content: (
                    <DashboardArea className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon">
                                <Bell className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                    </DashboardArea>
                )
            },
            // Stat cards in row 2
            {
                id: 'stat1',
                position: { startCol: 1, endCol: 2, startRow: 2 },
                content: <StatCard title="Total Users" value="1,234" icon={Users} />
            },
            {
                id: 'stat2',
                position: { startCol: 2, endCol: 3, startRow: 2 },
                content: <StatCard title="Total Revenue" value="$12,345" icon={LineChart} />
            },
            {
                id: 'stat3',
                position: { startCol: 3, endCol: 4, startRow: 2 },
                content: <StatCard title="Active Users" value="892" icon={Users} />
            },
            {
                id: 'stat4',
                position: { startCol: 4, endCol: 5, startRow: 2 },
                content: <StatCard title="Pending Tasks" value="23" icon={Calendar} />
            },
            // Main chart
            {
                id: 'mainChart',
                position: { startCol: 1, endCol: 4, startRow: 3, endRow: 5 },
                content: <Chart title="Revenue Overview" icon={LineChart} />
            },
            // Activity feed
            {
                id: 'activity',
                position: { startCol: 4, endCol: 5, startRow: 3, endRow: 5 },
                content: <ActivityFeed />
            }
        ],
        analytics: [
            // Header
            {
                id: 'header',
                position: { startCol: 1, endCol: 5, startRow: 1 },
                content: (
                    <DashboardArea className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Analytics</h1>
                        <Button variant="outline">Export</Button>
                    </DashboardArea>
                )
            },
            // Main chart
            {
                id: 'mainChart',
                position: { startCol: 1, endCol: 4, startRow: 2, endRow: 4 },
                content: <Chart title="Performance Analytics" icon={BarChart} />
            },
            // Side charts
            {
                id: 'pieChart1',
                position: { startCol: 4, endCol: 5, startRow: 2 },
                content: <Chart title="Distribution" icon={PieChart} />
            },
            {
                id: 'pieChart2',
                position: { startCol: 4, endCol: 5, startRow: 3 },
                content: <Chart title="Breakdown" icon={PieChart} />
            },
            // Bottom row of stats
            {
                id: 'bottomStats',
                position: { startCol: 1, endCol: 5, startRow: 4, endRow: 5 },
                content: (
                    <div className="grid grid-cols-4 gap-4 h-full">
                        <StatCard title="Metric 1" value="123" icon={LineChart} />
                        <StatCard title="Metric 2" value="456" icon={BarChart} />
                        <StatCard title="Metric 3" value="789" icon={PieChart} />
                        <StatCard title="Metric 4" value="321" icon={LineChart} />
                    </div>
                )
            }
        ],
        compact: [
            // Compact header with stats
            {
                id: 'header',
                position: { startCol: 1, endCol: 5, startRow: 1 },
                content: (
                    <DashboardArea>
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold">Compact View</h1>
                            <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <StatCard title="Users" value="1.2k" icon={Users} />
                            <StatCard title="Revenue" value="$12k" icon={LineChart} />
                            <StatCard title="Messages" value="234" icon={Mail} />
                            <StatCard title="Tasks" value="34" icon={Calendar} />
                        </div>
                    </DashboardArea>
                )
            },
            // Main content area
            {
                id: 'main',
                position: { startCol: 1, endCol: 5, startRow: 2, endRow: 5 },
                content: (
                    <div className="grid grid-cols-3 gap-4 h-full">
                        <Chart title="Chart 1" icon={LineChart} />
                        <Chart title="Chart 2" icon={BarChart} />
                        <Chart title="Chart 3" icon={PieChart} />
                    </div>
                )
            }
        ]
    };

    return (
        <div className="p-4 space-y-4">
            {/* Layout Controls */}
            <Card className="p-4">
                <Select
                    value={layout}
                    onValueChange={(value: 'dashboard' | 'analytics' | 'compact') => setLayout(value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="dashboard">Dashboard Layout</SelectItem>
                        <SelectItem value="analytics">Analytics Layout</SelectItem>
                        <SelectItem value="compact">Compact Layout</SelectItem>
                    </SelectContent>
                </Select>
            </Card>

            {/* Grid Layout */}
            <GridLayout
                items={layouts[layout]}
                gap={4}
                className="min-h-[800px]"
            />
        </div>
    );
};

export default Page;
