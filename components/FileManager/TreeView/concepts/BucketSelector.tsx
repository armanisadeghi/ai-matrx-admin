'use client';

import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useFileSystem } from "@/providers/FileSystemProvider";
import { BucketStructureWithNodes } from "@/utils/file-operations";

export const BucketSelector = () => {
    const { currentBucket, setCurrentBucket, getAllBucketStructures } = useFileSystem();
    const structures: Map<string, BucketStructureWithNodes> = getAllBucketStructures();
    const buckets = Array.from(structures.values());

    return (
        <Select
            value={currentBucket ?? undefined}
            onValueChange={(value: string) => setCurrentBucket(value)}
        >
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select bucket" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
                {buckets.map((bucket) => (
                    <SelectItem key={bucket.name} value={bucket.name}>
                        {bucket.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};