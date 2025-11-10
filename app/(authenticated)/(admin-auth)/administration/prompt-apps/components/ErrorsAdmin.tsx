'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
    Search,
    AlertCircle,
    CheckCircle,
    XCircle,
    ExternalLink
} from 'lucide-react';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';
import {
    fetchErrors,
    resolveError,
    unresolveError,
    PromptAppError
} from '@/lib/services/prompt-apps-admin-service';

const ERROR_TYPE_LABELS: Record<string, string> = {
    'missing_variable': 'Missing Variable',
    'extra_variable': 'Extra Variable',
    'invalid_variable_type': 'Invalid Variable Type',
    'component_render_error': 'Component Render Error',
    'api_error': 'API Error',
    'rate_limit': 'Rate Limit',
    'other': 'Other'
};

export function ErrorsAdmin() {
    const [errors, setErrors] = useState<PromptAppError[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all');
    const [resolvedFilter, setResolvedFilter] = useState<string>('unresolved');
    const [selectedError, setSelectedError] = useState<PromptAppError | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const resolvedValue = resolvedFilter === 'all' ? undefined : resolvedFilter === 'resolved';
            const data = await fetchErrors({
                resolved: resolvedValue,
                limit: 500
            });
            setErrors(data);
        } catch (error) {
            console.error('Error loading errors:', error);
            toast({
                title: "Error",
                description: "Failed to load errors",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [resolvedFilter, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredErrors = errors.filter(error => {
        const matchesSearch = searchTerm === '' || 
            error.app_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            error.app_slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            error.error_message?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = errorTypeFilter === 'all' || error.error_type === errorTypeFilter;
        
        return matchesSearch && matchesType;
    });

    const handleViewError = (error: PromptAppError) => {
        setSelectedError(error);
        setResolutionNotes(error.resolution_notes || '');
        setIsDetailDialogOpen(true);
    };

    const handleResolveError = async () => {
        if (!selectedError) return;

        try {
            await resolveError({
                id: selectedError.id,
                resolution_notes: resolutionNotes
            });
            setIsDetailDialogOpen(false);
            loadData();
            toast({
                title: "Success",
                description: "Error marked as resolved",
                variant: "success"
            });
        } catch (error) {
            console.error('Error resolving error:', error);
            toast({
                title: "Error",
                description: "Failed to resolve error",
                variant: "destructive"
            });
        }
    };

    const handleUnresolveError = async () => {
        if (!selectedError) return;

        try {
            await unresolveError(selectedError.id);
            setIsDetailDialogOpen(false);
            loadData();
            toast({
                title: "Success",
                description: "Error marked as unresolved",
                variant: "success"
            });
        } catch (error) {
            console.error('Error unresolving error:', error);
            toast({
                title: "Error",
                description: "Failed to unresolve error",
                variant: "destructive"
            });
        }
    };

    const getErrorTypeBadge = (errorType: string) => {
        const variants: Record<string, any> = {
            'missing_variable': 'destructive',
            'extra_variable': 'outline',
            'invalid_variable_type': 'destructive',
            'component_render_error': 'destructive',
            'api_error': 'destructive',
            'rate_limit': 'secondary',
            'other': 'outline'
        };
        return (
            <Badge variant={variants[errorType] || 'outline'}>
                {ERROR_TYPE_LABELS[errorType] || errorType}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <MatrxMiniLoader />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-textured overflow-hidden">
            {/* Header with Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-textured space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Error Management
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {filteredErrors.length} errors
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search errors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Error Types</SelectItem>
                            {Object.entries(ERROR_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Errors</SelectItem>
                            <SelectItem value="unresolved">Unresolved Only</SelectItem>
                            <SelectItem value="resolved">Resolved Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Errors List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {filteredErrors.map(error => (
                        <div
                            key={error.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-background hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleViewError(error)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {error.resolved ? (
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                        )}
                                        {getErrorTypeBadge(error.error_type)}
                                        {error.resolved && (
                                            <Badge variant="outline" className="text-green-600 border-green-600">
                                                Resolved
                                            </Badge>
                                        )}
                                    </div>

                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {error.error_message || 'No error message'}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                        <span>App: {error.app_name}</span>
                                        <a 
                                            href={`/p/${error.app_slug}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                        >
                                            View App <ExternalLink className="w-3 h-3" />
                                        </a>
                                        {error.error_code && <span>Code: {error.error_code}</span>}
                                        <span>{new Date(error.created_at).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex-shrink-0">
                                    <Button
                                        variant={error.resolved ? "outline" : "default"}
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewError(error);
                                        }}
                                    >
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredErrors.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No errors found matching the filters</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Error Detail Dialog */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedError?.resolved ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                            Error Details
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedError && (
                        <div className="space-y-4">
                            <div>
                                <Label>Error Type</Label>
                                <div className="mt-1">
                                    {getErrorTypeBadge(selectedError.error_type)}
                                </div>
                            </div>

                            <div>
                                <Label>Message</Label>
                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                    {selectedError.error_message || 'No error message'}
                                </p>
                            </div>

                            {selectedError.error_code && (
                                <div>
                                    <Label>Error Code</Label>
                                    <code className="block mt-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                                        {selectedError.error_code}
                                    </code>
                                </div>
                            )}

                            <div>
                                <Label>App</Label>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-sm">{selectedError.app_name}</span>
                                    <a 
                                        href={`/p/${selectedError.app_slug}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            <div>
                                <Label>Variables Sent</Label>
                                <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(selectedError.variables_sent, null, 2)}
                                </pre>
                            </div>

                            <div>
                                <Label>Expected Variables</Label>
                                <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(selectedError.expected_variables, null, 2)}
                                </pre>
                            </div>

                            {Object.keys(selectedError.error_details || {}).length > 0 && (
                                <div>
                                    <Label>Error Details</Label>
                                    <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(selectedError.error_details, null, 2)}
                                    </pre>
                                </div>
                            )}

                            <div>
                                <Label>Created At</Label>
                                <p className="mt-1 text-sm">
                                    {new Date(selectedError.created_at).toLocaleString()}
                                </p>
                            </div>

                            {selectedError.resolved && (
                                <>
                                    <div>
                                        <Label>Resolved At</Label>
                                        <p className="mt-1 text-sm">
                                            {selectedError.resolved_at ? new Date(selectedError.resolved_at).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                    {selectedError.resolution_notes && (
                                        <div>
                                            <Label>Resolution Notes</Label>
                                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {selectedError.resolution_notes}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}

                            {!selectedError.resolved && (
                                <div>
                                    <Label htmlFor="resolution-notes">Resolution Notes</Label>
                                    <Textarea
                                        id="resolution-notes"
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                        placeholder="Add notes about how this error was resolved..."
                                        rows={4}
                                        className="mt-1"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                                    Close
                                </Button>
                                {selectedError.resolved ? (
                                    <Button variant="outline" onClick={handleUnresolveError}>
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Mark as Unresolved
                                    </Button>
                                ) : (
                                    <Button onClick={handleResolveError}>
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Mark as Resolved
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

