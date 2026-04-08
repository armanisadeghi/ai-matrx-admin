import { Skeleton } from "@/components/ui/skeleton";

// Matches NoteViewShell — single panel with editor skeleton
export default function NoteDetailLoading() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
            {/* Title */}
            <Skeleton className="h-7 w-1/2 rounded" />
            {/* Toolbar row */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded" />
                <Skeleton className="h-5 w-14 rounded" />
                <Skeleton className="h-5 w-14 rounded" />
            </div>
            {/* Body lines */}
            <div className="space-y-2.5 flex-1">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-11/12 rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
                <div className="pt-1" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <div className="pt-1" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
            </div>
        </div>
    );
}
