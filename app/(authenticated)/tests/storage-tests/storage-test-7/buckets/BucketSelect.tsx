'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStorageBuckets } from "./useStorageBuckets";

type BucketSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export default function BucketSelect({ value, onValueChange }: BucketSelectProps) {
  const { buckets, loading, error } = useStorageBuckets();

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Error loading buckets" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={loading}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={loading ? "Loading buckets..." : "Select bucket"} />
      </SelectTrigger>
      <SelectContent>
        {buckets.map((bucket) => (
          <SelectItem key={bucket} value={bucket}>
            {bucket}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}