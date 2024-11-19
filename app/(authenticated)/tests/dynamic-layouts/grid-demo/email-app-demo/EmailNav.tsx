'use client';

import React, {useCallback, useState} from 'react';
import {GridLayout, DashboardArea} from '../GridLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {cn} from '@/lib/utils';
import {
    Search,
    Mail,
    Inbox,
    Send,
    Archive,
    Trash2,
    Star,
    Tag as Label,
    Flag,
    MoreHorizontal,
    Plus,
    ChevronDown,
    Reply,
    Forward,
    Paperclip,
    Image as ImageIcon,
    Smile,
    ChevronLeft,
    ChevronRight,
    GripVertical, Menu, Calendar, CheckSquare, MessageCircle, MessageSquare, Bell,
    Minimize2, Maximize2,
    Download
} from 'lucide-react';
import ResizablePanel from "@/app/(authenticated)/tests/dynamic-layouts/grid-demo/email-app-demo/ResizablePanel";
import QuickActionsPanel from "@/app/(authenticated)/tests/dynamic-layouts/grid-demo/email-app-demo/QuickActionsPanel";
import EmailList from "@/app/(authenticated)/tests/dynamic-layouts/grid-demo/email-app-demo/EmailList";


const EmailNav = ({ collapsed = false }) => (
    <DashboardArea className="flex flex-col h-full">
        <Button
            className={cn(
                "mb-4  mt-4  flex items-center justify-center",
                collapsed ? "w-7 h-7 mt-4 p-0 mx-auto" : "w-full"
            )}
        >
            {collapsed ? (
                <Plus className="h-5 w-5" />
            ) : (
                 <>
                     <Plus className="mr-2 h-4 w-4" /> Compose
                 </>
             )}
        </Button>
        <ScrollArea className="flex-1">
            <div className={cn("space-y-3", collapsed && "flex flex-col items-center")}>
                {[
                    {icon: Inbox, label: 'Inbox', count: 24 },
                    { icon: Star, label: 'Starred', count: 3 },
                    { icon: Send, label: 'Sent' },
                    { icon: Archive, label: 'Archive' },
                    { icon: Flag, label: 'Flagged', count: 5 },
                    { icon: Label, label: 'Important', count: 8 },
                    { icon: Trash2, label: 'Trash' },
                ].map((item) => (
                    <Button
                        key={item.label}
                        variant={item.label === 'Inbox' ? 'secondary' : 'ghost'}
                        className={cn(
                            collapsed
                            ? "w-7 h-7 p-0 justify-center relative group"
                            : "w-full justify-start"
                        )}
                    >
                        <item.icon className={cn(
                            "h-5 w-5",
                            !collapsed && "mr-2"
                        )} />
                        {!collapsed && item.label}
                        {item.count && (
                            collapsed ? (
                                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center">
                                    {item.count}
                                </span>
                            ) : (
                                <span className="ml-auto bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                                    {item.count}
                                </span>
                            )
                        )}
                        {collapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground rounded-md opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        )}
                    </Button>
                ))}
            </div>

            {!collapsed && (
                <div className="mt-6">
                    <h3 className="font-semibold text-sm px-2 mb-2">Labels</h3>
                    {[
                        { color: 'bg-red-500', label: 'Personal' },
                        { color: 'bg-blue-500', label: 'Work' },
                        { color: 'bg-green-500', label: 'Projects' },
                        { color: 'bg-purple-500', label: 'Travel' },
                    ].map((item) => (
                        <Button
                            key={item.label}
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <div className={`w-3 h-3 gap-2 bg-blue-500 rounded-full ${item.color} mr-2`} />
                            {item.label}
                        </Button>
                    ))}
                </div>
            )}
            {collapsed && (
                <div className="flex flex-col items-center mt-6 space-y-2">
                    {[
                        { color: 'bg-red-500', label: 'Personal' },
                        { color: 'bg-blue-500', label: 'Work' },
                        { color: 'bg-green-500', label: 'Projects' },
                        { color: 'bg-purple-500', label: 'Travel' },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="w-3 h-3 rounded-full cursor-pointer group relative"
                            style={{ backgroundColor: item.color }}
                        >
                            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground rounded-md opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
    </DashboardArea>
);

export default EmailNav;
