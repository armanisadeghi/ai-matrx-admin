"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptSharedNote } from '@/features/notes/service/notesService';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useToastManager } from '@/hooks/useToastManager';
import { useAppSelector } from '@/lib/redux/hooks';

interface PageProps {
    params: {
        id: string;
    };
}

export default function AcceptSharedNotePage({ params }: PageProps) {
    const router = useRouter();
    const toast = useToastManager('notes');
    const user = useAppSelector((state) => state.user);
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const acceptShare = async () => {
            if (!user?.id) {
                setStatus('error');
                setErrorMessage('You must be logged in to accept shared notes');
                return;
            }

            try {
                await acceptSharedNote(params.id, user.id);
                setStatus('success');
                toast.success('Note added to your collection!');
                
                // Redirect to notes after a short delay
                setTimeout(() => {
                    router.push('/notes');
                }, 2000);
            } catch (error) {
                console.error('Error accepting shared note:', error);
                setStatus('error');
                setErrorMessage('Failed to accept note. It may not exist or you may not have permission.');
            }
        };

        acceptShare();
    }, [params.id, user, toast, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-800 rounded-lg shadow-lg">
                {status === 'loading' && (
                    <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-500" />
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                            Accepting Shared Note...
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Please wait while we add this note to your collection.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center">
                        <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                            Note Accepted!
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                            The shared note has been added to your collection.
                        </p>
                        <Button onClick={() => router.push('/notes')}>
                            Go to Notes
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                            Unable to Accept Note
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                            {errorMessage}
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" onClick={() => router.push('/notes')}>
                                Go to Notes
                            </Button>
                            <Button onClick={() => window.location.reload()}>
                                Try Again
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

