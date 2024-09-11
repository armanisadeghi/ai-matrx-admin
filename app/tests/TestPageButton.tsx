'use client'

import React from 'react';

interface TestPageButtonProps {
    page: {
        id: number;
        title: string;
    };
    onOpenWindow: (window: any) => void;
}

export default function TestPageButton({ page, onOpenWindow }: TestPageButtonProps) {
    return (
        <button
            onClick={() => onOpenWindow(page)}
            className="p-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
            {page.title}
        </button>
    );
}