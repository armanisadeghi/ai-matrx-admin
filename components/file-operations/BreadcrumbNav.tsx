// components/file-operations/BreadcrumbNav.tsx
import { Button } from "@/components/ui/button";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbNavProps {
    currentPath: string[];
    onNavigate: (index: number) => void;
    bucketName: string;
}

export function BreadcrumbNav({ currentPath, onNavigate, bucketName }: BreadcrumbNavProps) {
    return (
        <div className="flex items-center space-x-2 px-2 py-1 bg-muted/50 rounded-md">
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onNavigate(-1)}
            >
                <Home className="h-4 w-4" />
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onNavigate(0)}
            >
                {bucketName}
            </Button>
            {currentPath.map((segment, index) => (
                <div key={index} className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onNavigate(index + 1)}
                    >
                        {segment}
                    </Button>
                </div>
            ))}
        </div>
    );
}