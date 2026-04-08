import Link from "next/link";
import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NoteNotFound() {
    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center text-center space-y-3 max-w-xs">
                <div className="p-3 bg-muted rounded-full">
                    <FileX className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold mb-1">Note not found</h2>
                    <p className="text-xs text-muted-foreground">
                        This note doesn&apos;t exist or you don&apos;t have access to it.
                    </p>
                </div>
                <Link href="/notes">
                    <Button variant="outline" size="sm">Back to Notes</Button>
                </Link>
            </div>
        </div>
    );
}
