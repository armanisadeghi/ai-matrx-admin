'use client';

import React from 'react';
import {GridLayout, DashboardArea} from '../GridLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
    Mail,
    Archive,
    Trash2,
    Star,
    MoreHorizontal,
    ChevronDown,
    Reply,
    Paperclip,
    Image as ImageIcon,
    Smile,
    Minimize2, Maximize2,
    Download
} from 'lucide-react';


interface EmailHeaderProps {
    isMobile?: boolean
}

const EmailHeader = ({isMobile}: EmailHeaderProps) => (
    <div className="border-b bg-card/50 p-2 h-[52px] flex items-center justify-between">
        <div className="flex items-center gap-4">
            <h2 className="font-medium truncate">Message Subject</h2>
            <span className="text-sm text-muted-foreground">Inbox</span>
        </div>
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
                <Archive className="h-4 w-4"/>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4"/>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4"/>
            </Button>
        </div>
    </div>
);

export default EmailHeader;
