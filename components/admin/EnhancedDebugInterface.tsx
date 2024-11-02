'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
    Download,
    Search,
    Trash2,
    RefreshCw,
    MaximizeIcon,
    MinimizeIcon,
    Eye,
    EyeOff,
    ChevronRight,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RootState } from '@/lib/redux/store';
import { EntityKeys } from '@/types/entityTypes';
import ReorderableTabs from './ReorderableTab';
import ResizableDebugPanel from './ResizableDebugPanel';

// Helper function to format slice names
const formatSliceName = (name: string): string => {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/^overview$/i, 'Overview')
        .replace(/^entities$/i, 'Entities')
        .replace(/^globalCache$/i, 'Global Cache')
        .trim();
};

// Custom selectors for important state information
const useDebugSelectors = () => {
    const entities = useAppSelector((state: RootState) => state.entities);
    const schema = useAppSelector((state: RootState) => state.globalCache);

    return useMemo(() => ({
        entityStats: {
            total: Object.keys(entities).length,
            initialized: Object.values(entities).filter(e => e.initialized).length,
            withData: Object.values(entities).filter(e => e.data?.length > 0).length
        },
        schemaStats: {
            totalFields: Object.keys(schema.fields).length,
            entityCount: schema.entityNames.length,
            mappedEntities: Object.keys(schema.entityNameToCanonical).length
        }
    }), [entities, schema]);
};

interface StateNodeProps {
    path: string[];
    name: string;
    value: any;
    depth?: number;
    isLarge?: boolean;
}

const StateNode: React.FC<StateNodeProps> = ({ path, name, value, depth = 0, isLarge = false }) => {
    const [isOpen, setIsOpen] = useState(!isLarge);
    const isObject = typeof value === 'object' && value !== null;
    const hasChildren = isObject && Object.keys(value).length > 0;

    const formattedValue = useMemo(() => {
        if (!isObject) {
            if (typeof value === 'boolean') return value.toString();
            if (value === null) return 'null';
            if (value === undefined) return 'undefined';
            return String(value);
        }
        if (Array.isArray(value)) {
            return `Array(${value.length})`;
        }
        return `Object(${Object.keys(value).length})`;
    }, [value]);

    if (!hasChildren) {
        return (
            <div className="flex items-center gap-1 py-0.5">
                <span className="font-medium">{name}:</span>
                <span className="text-muted-foreground">{formattedValue}</span>
            </div>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-1 py-0.5 hover:bg-muted/50">
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span className="font-medium">{name}</span>
                    {isLarge && !isOpen && (
                        <Badge variant="outline" className="ml-1 text-xs py-0">
                            Large data
                        </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-1">
                        {Array.isArray(value) ? `Array(${value.length})` : `Object(${Object.keys(value).length})`}
                    </span>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="ml-2 border-l border-muted pl-2">
                    {Object.entries(value).map(([key, val]) => (
                        <StateNode
                            key={`${path.join('.')}.${key}`}
                            path={[...path, key]}
                            name={key}
                            value={val}
                            depth={depth + 1}
                            isLarge={typeof val === 'object' && val !== null && JSON.stringify(val).length > 10000}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};


export default function ReduxDebugInterface({
                                                defaultExpanded = false,
                                                initialSelectedEntity
                                            }: {
    defaultExpanded?: boolean;
    initialSelectedEntity?: EntityKeys;
}) {
    // Animation state
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimating(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Rest of the state
    const [isVisible, setIsVisible] = useState(true);
    const [activeTab, setActiveTab] = useState(initialSelectedEntity || 'overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [tabOrder, setTabOrder] = useState<string[]>(['overview']);
    const { theme } = useTheme();
    const debugSelectors = useDebugSelectors();

    // Redux State
    const globalState = useAppSelector((state: RootState) => state);

    const slices = useMemo(() => {
        const availableSlices = Object.keys(globalState).filter(key =>
            typeof globalState[key] === 'object' && key !== 'form'
        );

        if (tabOrder.length === 1) {
            setTabOrder(['overview', 'entities', 'globalCache', ...availableSlices.filter(s => !['entities', 'globalCache'].includes(s))]);
        }

        return availableSlices;
    }, [globalState]);

    if (isAnimating) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <ResizableDebugPanel>
                <div className="h-full flex flex-col">
                    <div className="p-2 border-b flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                <Input
                                    placeholder="Search state..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-6 h-8 text-sm"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={autoRefresh ? 'text-green-500' : 'text-muted-foreground'}
                            >
                                <RefreshCw className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsVisible(!isVisible)}
                            >
                                <EyeOff className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <div className="border-b">
                            <ReorderableTabs
                                tabs={tabOrder.map(formatSliceName)}
                                activeTab={activeTab}
                                onReorder={(newOrder) => {
                                    setTabOrder(newOrder.map(name =>
                                        name.toLowerCase()
                                            .replace(/\s+/g, '')
                                            .replace('globalcache', 'globalCache')
                                    ));
                                }}
                                onTabChange={setActiveTab}
                            />
                        </div>

                        <ScrollArea className="flex-1">
                            <TabsContent value="overview" className="p-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Card>
                                        <CardContent className="p-2">
                                            <h3 className="font-medium mb-2 text-sm">Entity Statistics</h3>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span>Total Entities:</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {debugSelectors.entityStats.total}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Initialized:</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {debugSelectors.entityStats.initialized}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>With Data:</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {debugSelectors.entityStats.withData}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-2">
                                            <h3 className="font-medium mb-2 text-sm">Schema Statistics</h3>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span>Total Fields:</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {debugSelectors.schemaStats.totalFields}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Entity Count:</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {debugSelectors.schemaStats.entityCount}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Mapped Entities:</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {debugSelectors.schemaStats.mappedEntities}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {slices.map(slice => (
                                <TabsContent
                                    key={slice}
                                    value={slice}
                                    className="p-2"
                                >
                                    <StateNode
                                        path={[slice]}
                                        name={formatSliceName(slice)}
                                        value={globalState[slice]}
                                        isLarge={JSON.stringify(globalState[slice]).length > 10000}
                                    />
                                </TabsContent>
                            ))}
                        </ScrollArea>
                    </Tabs>
                </div>
            </ResizableDebugPanel>
        </motion.div>
    );
}
