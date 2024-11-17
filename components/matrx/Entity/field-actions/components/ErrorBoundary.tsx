// components/ErrorBoundary.tsx
import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error) => void;
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    { hasError: boolean; error: Error | null }
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        this.props.onError?.(error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <AlertDialog open>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Something went wrong</AlertDialogTitle>
                            <AlertDialogDescription>
                                {this.state.error?.message}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogAction onClick={() => this.setState({ hasError: false })}>
                            Try again
                        </AlertDialogAction>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }

        return this.props.children;
    }
}
