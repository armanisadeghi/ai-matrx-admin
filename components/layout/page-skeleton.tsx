// components/page-skeleton.tsx
import { cn } from "@/lib/utils"

interface PageSkeletonProps {
    className?: string
}

export default function PageSkeleton({ className }: PageSkeletonProps) {
    return (
        <div className={cn("animate-pulse space-y-4 w-full", className)}>
            <div className="h-8 w-3/4 bg-muted rounded" />
            <div className="space-y-2">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-5/6 bg-muted rounded" />
                <div className="h-4 w-4/6 bg-muted rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted rounded" />
                ))}
            </div>
        </div>
    )
}
