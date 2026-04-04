"use client";

const DEFAULT_NOTES =
  "Window panel demo notes:\n\n• Drag the header to move\n• Resize from any edge or corner\n• Yellow button minimizes in-place\n• Green button maximizes / snaps\n• Click-drag the minimized chip to reposition";

export function NotesWindowBody() {
  return (
    <div className="p-4 h-full">
      <textarea
        className="w-full h-full resize-none bg-transparent text-sm text-foreground/80 focus:outline-none placeholder:text-muted-foreground/50"
        placeholder="Write something here..."
        defaultValue={DEFAULT_NOTES}
      />
    </div>
  );
}
