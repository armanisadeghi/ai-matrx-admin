// app/news/dismissible-alert.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from "@ai-matrx/design-system";
import { X } from 'lucide-react';
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

interface DismissibleAlertProps {
    sourceName: string;
    title: string;
    url: string;
    index: number;
}

export function DismissibleAlert({ sourceName, title, url, index }: DismissibleAlertProps) {
    const handleDismiss = () => {
        const alert = document.getElementById(`headline-${index}`);
        if (alert) alert.remove();
    };

    return (
        <Alert id={`headline-${index}`} className="relative">
            <AlertTitle className="pr-8">{sourceName}</AlertTitle>
            <AlertDescription className="pr-8">
                <OutboundLink
                    href={url}
                    className="hover:underline"
                >
                    {title}
                </OutboundLink>
            </AlertDescription>
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                onClick={handleDismiss}
            >
                <X className="h-4 w-4" />
            </Button>
        </Alert>
    );
}

