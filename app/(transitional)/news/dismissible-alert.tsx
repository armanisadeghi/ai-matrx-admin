// app/news/dismissible-alert.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
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
        <Alert id={`headline-${index}`}>
            <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <AlertTitle>{sourceName}</AlertTitle>
                    <AlertDescription>
                        <OutboundLink
                            href={url}
                            className="hover:underline"
                        >
                            {title}
                        </OutboundLink>
                    </AlertDescription>
                </div>
                <Button
                    icon={<X />}
                    variant="quiet"
                    className="shrink-0"
                    aria-label="Dismiss"
                    onClick={handleDismiss}
                />
            </div>
        </Alert>
    );
}

