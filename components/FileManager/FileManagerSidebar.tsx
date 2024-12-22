// components/FileManager/FileManagerSidebar.tsx
import React from 'react';
import {TreeView} from './TreeView';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ChevronLeft, ChevronRight} from 'lucide-react';

export const FileManagerSidebar: React.FC = () => {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div className={`relative border-r ${collapsed ? 'w-12' : 'w-64'} transition-all duration-300`}>
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-2 z-10"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? (
                    <ChevronRight className="h-4 w-4"/>
                ) : (
                    <ChevronLeft className="h-4 w-4"/>
                )}
            </Button>

            <Card className="h-full rounded-none border-0">
                <ScrollArea className="h-full">
                    {!collapsed && (
                        <TreeView/>
                    )}
                </ScrollArea>
            </Card>
        </div>
    );
};