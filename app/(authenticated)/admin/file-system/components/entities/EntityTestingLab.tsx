// app/admin/components/entity-testing/EntityTestingLab.tsx
'use client';

import {useState, useEffect, useCallback} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEntity } from '@/lib/redux/entity/useEntity';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';
import LogViewer from './LogViewer';



const EntityTestingLab = () => {
    const [selectedEntity, setSelectedEntity] = useState<string>('registeredFunction');
    const [currentTab, setCurrentTab] = useState('browse');
    const entity = useEntity(selectedEntity);
    const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
    const [filterValue, setFilterValue] = useState('');
    const [sortField, setSortField] = useState('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');


    const [errorLog, setErrorLog] = useState<Array<{
        timestamp: string;
        message: string;
        details?: any;
    }>>([]);

// Add error logging function
    const logError = useCallback((error: any) => {
        setErrorLog(prev => [{
            timestamp: new Date().toISOString(),
            message: error.message || 'An unknown error occurred',
            details: error
        }, ...prev]);
    }, []);

    useEffect(() => {
        console.log('Entity Metadata:', entity.entityMetadata);
        console.log('Current Page:', entity.currentPage);
        console.log('Loading State:', entity.loadingState);
        console.log('Error State:', entity.error);
    }, [entity]);

    useEffect(() => {
        try {
            console.log('Attempting to fetch records...');
            if (entity.entityMetadata) {
                console.log('Metadata available, fetching records');
                entity.fetchRecords(1, 10);
            } else {
                console.log('No metadata available yet');
            }
        } catch (error) {
            console.error('Error initializing entity:', error);
            logError(error);
        }
    }, [selectedEntity, entity.entityMetadata]);


    useEffect(() => {
        try {
            // Ensure we have metadata before fetching records
            if (entity.entityMetadata) {
                entity.fetchRecords(1, 10);
            }
        } catch (error) {
            console.error('Error initializing entity:', error);
            // Log to our error system
            logError(error);
        }
    }, [selectedEntity, entity.entityMetadata]);

// Add loading state handling
    if (!entity.entityMetadata) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading entity metadata...</span>
            </div>
        );
    }

    // Handle record selection
    const handleRecordSelect = (recordId: string) => {
        setSelectedRecords(prev =>
            prev.includes(recordId)
            ? prev.filter(id => id !== recordId)
            : [...prev, recordId]
        );
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="w-full h-full" // Remove container and padding
        >
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Entity Testing Laboratory</span>
                        <Select
                            value={selectedEntity}
                            onValueChange={setSelectedEntity}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Entity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="registeredFunction">Registered Functions</SelectItem>
                                <SelectItem value="recipe">Recipes</SelectItem>
                                <SelectItem value="emails">Emails</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardTitle>
                    <CardDescription>
                        Test and monitor entity operations in real-time
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs value={currentTab} onValueChange={setCurrentTab}>
                        <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="browse">Browse</TabsTrigger>
                            <TabsTrigger value="operations">Operations</TabsTrigger>
                            <TabsTrigger value="filters">Filters & Sort</TabsTrigger>
                            <TabsTrigger value="metrics">Metrics</TabsTrigger>
                            <TabsTrigger value="logs">Logs</TabsTrigger>
                            <TabsTrigger value="debug">Debug</TabsTrigger>
                        </TabsList>

                        <TabsContent value="browse">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="space-x-2">
                                        <Button
                                            onClick={() => entity.refreshData()}
                                            disabled={entity.loadingState.loading}
                                        >
                                            {entity.loadingState.loading && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Refresh
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => entity.clearSelection()}
                                        >
                                            Clear Selection
                                        </Button>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-muted-foreground">
                                            Page {entity.paginationInfo.page} of {entity.paginationInfo.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            disabled={!entity.paginationInfo.hasPreviousPage}
                                            onClick={() => entity.fetchRecords(
                                                entity.paginationInfo.page - 1,
                                                entity.paginationInfo.pageSize
                                            )}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            disabled={!entity.paginationInfo.hasNextPage}
                                            onClick={() => entity.fetchRecords(
                                                entity.paginationInfo.page + 1,
                                                entity.paginationInfo.pageSize
                                            )}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>

                                <ScrollArea className="h-[400px] rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">Select</TableHead>
                                                {entity.entityMetadata?.fields.map(field => (
                                                    <TableHead key={field.name}>
                                                        {field.displayName}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <AnimatePresence>
                                                {entity.currentPage.map((record: any) => (
                                                    <motion.tr
                                                        key={record[entity.primaryKeyMetadata.fields[0]]}
                                                        variants={itemVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="hidden"
                                                        className="cursor-pointer hover:bg-muted"
                                                        onClick={() => handleRecordSelect(record[entity.primaryKeyMetadata.fields[0]])}
                                                    >
                                                        <TableCell>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedRecords.includes(record[entity.primaryKeyMetadata.fields[0]])}
                                                                onChange={() => {}}
                                                            />
                                                        </TableCell>
                                                        {entity.entityMetadata?.fields.map(field => (
                                                            <TableCell key={field.name}>
                                                                {record[field.name]}
                                                            </TableCell>
                                                        ))}
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </TabsContent>
                        <TabsContent value="logs">
                            <LogViewer />
                        </TabsContent>
                        <TabsContent value="debug">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Debug Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="font-medium">Entity Metadata</h3>
                                                <pre className="bg-muted p-2 rounded-md">
                            {JSON.stringify(entity.entityMetadata, null, 2)}
                        </pre>
                                            </div>
                                            <div>
                                                <h3 className="font-medium">Loading State</h3>
                                                <pre className="bg-muted p-2 rounded-md">
                            {JSON.stringify(entity.loadingState, null, 2)}
                        </pre>
                                            </div>
                                            <div>
                                                <h3 className="font-medium">Current Page Data</h3>
                                                <pre className="bg-muted p-2 rounded-md">
                            {JSON.stringify(entity.currentPage, null, 2)}
                        </pre>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="operations">
                            <div className="grid grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Create Record</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Add create form */}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Update Record</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Add update form */}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="filters">
                            <div className="space-y-4">
                                <div className="flex space-x-4">
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Filter value..."
                                            value={filterValue}
                                            onChange={(e) => setFilterValue(e.target.value)}
                                        />
                                    </div>
                                    <Select
                                        value={sortField}
                                        onValueChange={setSortField}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Sort by..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {entity.entityMetadata?.fields.map(field => (
                                                <SelectItem key={field.name} value={field.name}>
                                                    {field.displayName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={sortDirection}
                                        onValueChange={(value: 'asc' | 'desc') => setSortDirection(value)}
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            <SelectValue placeholder="Direction" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="asc">Asc</SelectItem>
                                            <SelectItem value="desc">Desc</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={() => {
                                            entity.setSorting({
                                                field: sortField,
                                                direction: sortDirection
                                            });
                                        }}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="metrics">
                            <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Cache Status</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span>Is Stale:</span>
                                                <Badge variant={entity.isStale ? "destructive" : "secondary"}>
                                                    {entity.isStale ? "Yes" : "No"}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Has Unsaved Changes:</span>
                                                <Badge variant={entity.hasUnsavedChanges ? "destructive" : "secondary"}>
                                                    {entity.hasUnsavedChanges ? "Yes" : "No"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-center">
                                            Error Log
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setErrorLog([])}
                                            >
                                                Clear
                                            </Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[200px]">
                                            {errorLog.map((error, index) => (
                                                <div
                                                    key={index}
                                                    className="border-b border-muted p-2 last:border-0"
                                                >
                                                    <div className="flex justify-between">
                                <span className="text-sm font-medium">
                                    {new Date(error.timestamp).toLocaleString()}
                                </span>
                                                        <Badge variant="destructive">Error</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {error.message}
                                                    </p>
                                                    {error.details && (
                                                        <pre className="text-xs bg-muted p-2 mt-2 rounded">
                                    {JSON.stringify(error.details, null, 2)}
                                </pre>
                                                    )}
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Operation History</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[200px]">
                                            {entity.history.past.map((entry, index) => (
                                                <div key={index} className="flex justify-between items-center py-2">
                                                    <span>{entry.operation}</span>
                                                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Quick Reference</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[200px]">
                                            {entity.quickReference.map((ref, index) => (
                                                <div key={index} className="py-1">
                                                    {ref.displayValue}
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>

                <CardFooter className="bg-muted/50 p-4">
                    <div className="w-full flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <Badge variant={entity.loadingState.loading ? "secondary" : "default"}>
                                {entity.loadingState.loading ? "Loading..." : "Ready"}
                            </Badge>
                            {entity.error && (
                                <Badge variant="destructive">
                                    Error: {entity.error.message}
                                </Badge>
                            )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                            Total Records: {entity.paginationInfo.totalCount}
                        </span>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

export default EntityTestingLab;
