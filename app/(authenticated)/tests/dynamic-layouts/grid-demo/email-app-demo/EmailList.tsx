'use client';

import React from 'react';
import {GridLayout, DashboardArea} from '../GridLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Card, CardContent} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {
    Search,
    Star,
    Paperclip
} from 'lucide-react';
import {useQuickReference} from "@/lib/redux/entity/hooks/useQuickReference";
import {Checkbox} from "@/components/ui";

const EmailList = ({onEmailClick}: { onEmailClick?: () => void }) => {
    const entityKey = "emails";
    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        toggleSelectionMode,
    } = useQuickReference(entityKey);

    // Merge quick reference data with demo data
    const mergedEmails = quickReferenceRecords.map((refRecord, index) => ({
        id: refRecord.recordKey, // Use actual record ID
        from: `User ${index + 1}`, // Demo data
        subject: refRecord.displayValue, // Use actual display value
        preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
        time: '10:30 AM',
        isRead: Math.random() > 0.5,
        isStarred: Math.random() > 0.7,
        hasAttachments: Math.random() > 0.6,
        labels: [['Work', 'Personal', 'Junk', 'Spam', 'Urgent'][index % 5]],
    }));

    return (
        <DashboardArea className="flex flex-col h-full">
            <div className="border-b p-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input
                        placeholder="Search emails..."
                        className="w-full pl-9 h-9"
                    />
                </div>
            </div>
            <ScrollArea className="flex-1">
                {mergedEmails.map((email) => (
                    <Card
                        key={email.id}
                        className={cn(
                            "relative flex flex-col gap-2 px-2 py-3 border-b rounded-none hover:bg-muted/50 cursor-pointer",
                            !email.isRead && "bg-muted/30 font-medium",
                            isSelected(email.id) && "bg-accent" // Add selection highlighting
                        )}
                        onClick={() => handleRecordSelect(email.id)}
                    >
                        {/* Row 1: Star, From, Time */}
                        <div className="flex items-center justify-between min-h-[24px]">
                            <div className="flex items-center flex-grow min-w-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "p-1 h-8 w-8 shrink-0",
                                        email.isStarred && "text-yellow-500"
                                    )}
                                >
                                    <Star className="h-4 w-4"/>
                                </Button>
                                <span className="font-medium truncate ml-2">
                                    {email.from}
                                </span>
                            </div>
                            <span className="text-sm text-muted-foreground ml-2 shrink-0">
                                {email.time}
                            </span>
                        </div>

                        {/* Row 2: Subject (displayValue), Labels */}
                        <div className="flex items-center justify-between min-h-[24px]">
                            <span className="text-sm truncate pl-2 flex-grow min-w-0">
                                {email.subject} {/* This is now using refRecord.displayValue */}
                            </span>
                            <div className="ml-2 shrink-0">
                                {email.hasAttachments && (
                                    <Paperclip className="h-4 w-4 text-muted-foreground"/>
                                )}
                            </div>
                        </div>

                        {/* Row 3: Preview, Labels */}
                        <div className="flex items-center justify-between min-h-[24px]">
                            <p className="text-sm text-muted-foreground truncate pl-2 flex-grow min-w-0 overflow-hidden">
                                {email.preview.length > 30
                                 ? `${email.preview.slice(0, 30)}...`
                                 : email.preview}
                            </p>
                            <div className="ml-2 shrink-0">
                                {email.labels?.map((label) => (
                                    <span
                                        key={label}
                                        className="bg-blue-500/10 text-blue-500 text-xs rounded-full px-2 py-0.5"
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Card>
                ))}
            </ScrollArea>
        </DashboardArea>
    );
};

export default EmailList;
