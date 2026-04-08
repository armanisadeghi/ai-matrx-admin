import { Skeleton } from "@/components/ui/skeleton";

// Matches the NotesShell layout: 280px aside + main area with tab bar
export default function NotesLoading() {
    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex overflow-hidden">
            {/* Sidebar — 280px, mirrors NotesSidebar */}
            <aside className="w-[280px] shrink-0 border-r border-border flex flex-col overflow-hidden">
                {/* Sidebar toolbar row */}
                <div className="h-9 shrink-0 flex items-center gap-1.5 px-2 border-b border-border">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1" />
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-5 rounded" />
                </div>
                {/* Folder group header */}
                <div className="px-2 py-1.5">
                    <Skeleton className="h-4 w-16 rounded" />
                </div>
                {/* Note items */}
                <div className="flex flex-col gap-px px-1 overflow-hidden">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <div key={i} className="h-9 flex items-center gap-2 px-2 rounded">
                            <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                            <Skeleton className="h-3.5 flex-1 rounded" />
                            <Skeleton className="h-3 w-10 rounded shrink-0" />
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main area */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Tab bar */}
                <div className="h-9 shrink-0 flex items-center gap-px px-1 border-b border-border bg-muted/30">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-7 flex items-center gap-1.5 px-3 rounded-t">
                            <Skeleton className="h-3 w-20 rounded" />
                            <Skeleton className="h-3 w-3 rounded" />
                        </div>
                    ))}
                </div>
                {/* Editor area */}
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 p-4 space-y-3 overflow-hidden">
                        <Skeleton className="h-7 w-1/3 rounded" />
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-5/6 rounded" />
                        <Skeleton className="h-4 w-4/5 rounded" />
                        <div className="pt-2" />
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}
