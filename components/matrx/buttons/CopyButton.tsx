'use client';

import {
    Button,
} from '@/components/ui';
import { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';


interface CopyButtonProps {
    content: string;
    label?: string;
    className?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "icon" | "roundIcon";
}

export const CopyButton = ({ content, label, className, size="sm" }: CopyButtonProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <Button 
            variant="ghost" 
            size={size} 
            className={`px-2 h-7 flex items-center gap-1 ${className}`} 
            onClick={handleCopy}
            title={label || "Copy to clipboard"}
        >
            {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
                <Copy className="h-3.5 w-3.5" />
            )}
            {label && <span className="text-xs">{label}</span>}
        </Button>
    );
};

export default CopyButton;
