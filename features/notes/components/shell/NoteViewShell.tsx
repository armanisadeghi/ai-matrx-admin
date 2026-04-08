import type { ReactNode } from "react";
import type { NoteViewMode } from "../../types";

interface NoteViewShellProps {
    noteId: string;
    mode: NoteViewMode;
    /** Left panel (always rendered) */
    leftPanel: ReactNode;
    /** Right panel — only rendered in split mode when viewport is wide enough */
    rightPanel?: ReactNode;
}

/**
 * Server Component shell for any note view.
 * Determines single vs. split layout. Fixed dimensions — no layout shift.
 * The actual editor content is passed as leftPanel/rightPanel (client islands).
 */
export function NoteViewShell({ mode, leftPanel, rightPanel }: NoteViewShellProps) {
    const isSplit = mode === "split" && rightPanel != null;

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Left / only panel */}
            <div
                className={[
                    "flex flex-col overflow-hidden",
                    isSplit ? "w-1/2 border-r border-border" : "flex-1",
                ].join(" ")}
            >
                {leftPanel}
            </div>

            {/* Right panel — split mode only */}
            {isSplit && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {rightPanel}
                </div>
            )}
        </div>
    );
}
