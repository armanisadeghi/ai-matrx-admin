import React from 'react';
import { Loader2, AlertCircle, InboxIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export const LoadingSpinner = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[400px] p-8"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
                <Loader2 className="w-12 h-12 text-primary" />
            </motion.div>
            <p className="mt-4 text-lg text-muted-foreground">Loading your data...</p>
        </motion.div>
    );
};

export const ErrorDisplay = ({ error }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto p-4"
        >
            <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="ml-2">Error</AlertTitle>
                <AlertDescription className="mt-2">
                    {error?.message || 'An unexpected error occurred. Please try again.'}
                </AlertDescription>
                <div className="mt-4 flex justify-end">
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="bg-background hover:bg-secondary"
                    >
                        Try Again
                    </Button>
                </div>
            </Alert>
        </motion.div>
    );
};

export const EmptyState = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
        >
            <div className="rounded-full bg-muted p-4 mb-4">
                <InboxIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Data Found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
                It looks like there's nothing here yet. Start by creating your first record.
            </p>
            <Button
                variant="default"
                className="hover:scale-105 transition-transform"
                onClick={() => {
                    // Add your create action here
                }}
            >
                Create New
            </Button>
        </motion.div>
    );
};
