import { cn } from "@/styles/themes/utils";

interface PlainTextFallbackProps {
  requestId?: string;
  content: string;
  className?: string;
}

// Fallback component that renders plain text with basic formatting.
// Hardcoded for the assistant-message rendering mode — `type` and `role`
// were removed as part of the MarkdownStream prop cleanup.
export const PlainTextFallback: React.FC<PlainTextFallbackProps> = ({
  requestId,
  content,
  className,
}) => {
  const containerStyles = cn(
    "py-3 px-4 space-y-2 font-sans text-md antialiased leading-relaxed tracking-wide whitespace-pre-wrap break-words overflow-x-hidden min-w-0",
    "block rounded-lg w-full bg-textured",
    className,
  );

  return (
    <div className="mb-3 w-full min-w-0 text-left overflow-x-hidden">
      <div className={containerStyles}>{content || "No content available"}</div>
    </div>
  );
};
