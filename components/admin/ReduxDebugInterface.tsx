/*
'use client';

import React, {useEffect, useState} from 'react';
import {useAppSelector, useAppDispatch} from '@/lib/redux/hooks';
import {Download, Search, Trash2, RefreshCw, MaximizeIcon, MinimizeIcon, Eye, EyeOff, ChevronRight} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {useTheme} from 'next-themes';
import {Card, CardContent} from "@/components/ui/card";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {RootState} from '@/lib/redux/store';
import {EntityKeys} from '@/types/entityTypes';

interface ReduxDebugInterfaceProps {
    defaultExpanded?: boolean;
    initialSelectedEntity?: EntityKeys;
}

export default function ReduxDebugInterface(
    {
        defaultExpanded = false,
        initialSelectedEntity
    }: ReduxDebugInterfaceProps) {
    // UI State
    const [isVisible, setIsVisible] = useState(true);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [activeTab, setActiveTab] = useState(initialSelectedEntity || 'overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const {theme} = useTheme();

    // Redux State
    const dispatch = useAppDispatch();
    const globalState = useAppSelector((state: RootState) => state);
    const entities = useAppSelector((state: RootState) => state.entities);
    const schema = useAppSelector((state: RootState) => state.globalCache);

    // Get all available slices
    const slices = Object.keys(globalState).filter(key =>
        typeof globalState[key] === 'object' && key !== 'form'
    );

    // Function to format state values for display
    const formatValue = (value: any): string => {
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    };

    // Function to filter state based on search term
    const filterState = (state: any): any => {
        if (!searchTerm) return state;

        const searchRegex = new RegExp(searchTerm, 'i');
        const filtered: any = {};

        Object.entries(state).forEach(([key, value]) => {
            if (
                searchRegex.test(key) ||
                searchRegex.test(formatValue(value))
            ) {
                filtered[key] = value;
            }
        });

        return filtered;
    };

    // Function to render state object
    const renderStateObject = (obj: any, path: string[] = []) => {
        if (typeof obj !== 'object' || obj === null) {
            return (
                <div className="pl-4 py-1">
                    <span className="text-muted-foreground">{formatValue(obj)}</span>
                </div>
            );
        }

        return Object.entries(obj).map(([key, value]) => (
            <div key={`${path.join('.')}.${key}`} className="border-l-2 border-muted ml-2">
                <div className="flex items-center gap-2 pl-2 py-1 hover:bg-muted/50">
                    <ChevronRight className="w-4 h-4"/>
                    <span className="font-medium">{key}:</span>
                    {typeof value !== 'object' && (
                        <span className="text-muted-foreground">{formatValue(value)}</span>
                    )}
                </div>
                {typeof value === 'object' && value !== null && (
                    <div className="ml-4">
                        {renderStateObject(value, [...path, key])}
                    </div>
                )}
            </div>
        ));
    };

    // Container styles based on current state
    const containerStyles = isExpanded
                            ? "fixed inset-4 z-50"
                            : isVisible
                              ? "fixed bottom-4 right-4 w-96 h-96"
                              : "fixed bottom-4 right-4";

    return (
        <motion.div
            layout
            className={`${containerStyles} bg-background border rounded-lg shadow-lg overflow-hidden`}
        >
            {!isVisible ? (
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsVisible(true)}
                    className="w-10 h-10"
                >
                    <Eye className="w-4 h-4"/>
                </Button>
            ) : (
                 <Card className="h-full flex flex-col">
                     <div className="p-4 border-b flex items-center justify-between gap-2">
                         <div className="flex items-center gap-2 flex-1">
                             <div className="relative flex-1">
                                 <Search
                                     className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                 <Input
                                     placeholder="Search state..."
                                     value={searchTerm}
                                     onChange={(e) => setSearchTerm(e.target.value)}
                                     className="pl-8"
                                 />
                             </div>
                             <Button
                                 variant="outline"
                                 size="icon"
                                 onClick={() => setAutoRefresh(!autoRefresh)}
                                 className={autoRefresh ? 'text-green-500' : 'text-muted-foreground'}
                             >
                                 <RefreshCw className="w-4 h-4"/>
                             </Button>
                             <Button
                                 variant="outline"
                                 size="icon"
                                 onClick={() => setIsExpanded(!isExpanded)}
                             >
                                 {isExpanded ? (
                                     <MinimizeIcon className="w-4 h-4"/>
                                 ) : (
                                      <MaximizeIcon className="w-4 h-4"/>
                                  )}
                             </Button>
                             <Button
                                 variant="outline"
                                 size="icon"
                                 onClick={() => setIsVisible(false)}
                             >
                                 <EyeOff className="w-4 h-4"/>
                             </Button>
                         </div>
                     </div>

                     <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                         <div className="border-b px-4">
                             <TabsList className="w-full h-full flex overflow-x-auto">
                                 <TabsTrigger value="overview">Overview</TabsTrigger>
                                 {slices.map(slice => (
                                     <TabsTrigger key={slice} value={slice}>
                                         {slice}
                                     </TabsTrigger>
                                 ))}
                             </TabsList>
                         </div>

                         <TabsContent value="overview" className="flex-1 flex flex-col p-4">
                             <Alert>
                                 <AlertDescription>
                                     Available Slices: {slices.join(', ')}
                                 </AlertDescription>
                             </Alert>
                             <div className="mt-4">
                                 <h3 className="font-medium mb-2">Entity Information</h3>
                                 <div className="space-y-2">
                                     <div>Total Entities: {Object.keys(entities).length}</div>
                                     <div>Initialized Entities: {
                                         Object.values(entities).filter(e => e.initialized).length
                                     }</div>
                                 </div>
                             </div>
                             <div className="mt-4">
                                 <h3 className="font-medium mb-2">Schema Information</h3>
                                 <div className="space-y-2">
                                     <div>Total Fields: {Object.keys(schema.fields).length}</div>
                                     <div>Entity Names: {schema.entityNames.join(', ')}</div>
                                 </div>
                             </div>
                         </TabsContent>

                         {slices.map(slice => (
                             <TabsContent key={slice} value={slice} className="flex-1 flex flex-col">
                                 <ScrollArea className="flex-1 p-4">
                                     <div className="space-y-2">
                                         {renderStateObject(filterState(globalState[slice]))}
                                     </div>
                                 </ScrollArea>
                             </TabsContent>
                         ))}
                     </Tabs>
                 </Card>
             )}
        </motion.div>
    );
}
*/
