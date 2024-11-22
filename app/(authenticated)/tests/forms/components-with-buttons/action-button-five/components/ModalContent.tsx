// components/ModalContent.tsx
import React from 'react';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { FormVariant } from '../types';

interface ModalContentProps {
    variant: FormVariant;
    value?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const ModalContent: React.FC<ModalContentProps> = ({ variant, value, onChange }) => {
    switch (variant) {
        case 'json':
        case 'code':
            return (
                <textarea
                    value={value || ''}
                    onChange={onChange}
                    className="w-full min-h-[200px] p-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
            );
        case 'datetime':
            return (
                <div className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label>Date</Label>
                        <input
                            type="date"
                            className="w-full p-2 bg-input border border-border rounded-md text-foreground"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Time</Label>
                        <input
                            type="time"
                            className="w-full p-2 bg-input border border-border rounded-md text-foreground"
                        />
                    </div>
                </div>
            );
        case 'file':
            return (
                <div className="flex flex-col gap-4">
                    <input
                        type="file"
                        className="text-foreground"
                    />
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground"/>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Drag and drop your file here, or click to browse
                        </p>
                    </div>
                </div>
            );
        default:
            return (
                <textarea
                    value={value || ''}
                    onChange={onChange}
                    className="w-full min-h-[200px] p-3 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
            );
    }
};

export default ModalContent;
