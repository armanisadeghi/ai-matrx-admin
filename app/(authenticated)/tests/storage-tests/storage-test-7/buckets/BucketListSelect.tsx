// BucketListSelect.tsx
'use client';

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";
import { useStorageBuckets } from "./useStorageBuckets";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type BucketListSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export default function BucketListSelect({ value, onValueChange }: BucketListSelectProps) {
  const { buckets, loading, error } = useStorageBuckets();

  if (loading) {
    return (
      <div className="p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-2 py-1.5">
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive flex items-center gap-2">
        <Database className="h-4 w-4" />
        <span>Error loading buckets</span>
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Database className="h-4 w-4" />
        <span>No buckets found</span>
      </div>
    );
  }

  return (
    <div className="p-2">
      {buckets.map((bucket) => (
        <Button
          key={bucket}
          variant="ghost"
          size="sm"
          className={cn(
            "w-full h-8 px-2 justify-start text-sm hover:bg-accent hover:text-accent-foreground",
            value === bucket && "bg-accent"
          )}
          onClick={() => onValueChange(bucket)}
        >
          <div className="flex items-center min-w-0 w-full">
            <div className="flex items-center flex-none">
              <Database className="h-4 w-4 mr-2" />
            </div>
            <span className="truncate flex-1 text-left">
              {bucket}
            </span>
          </div>
        </Button>
      ))}
    </div>
  );
}