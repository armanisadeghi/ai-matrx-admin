import { cn } from "@/styles/themes/utils";

interface PlainTextFallbackProps {
  requestId?: string;
  content: string;
  className?: string;
  role?: string;
  type?: string;
}

// Fallback component that renders plain text with basic formatting
export const PlainTextFallback: React.FC<PlainTextFallbackProps> = ({
  requestId,
  content,
  className,
  role,
  type,
}) => {
  const containerStyles = cn(
    "py-3 px-4 space-y-2 font-sans text-md antialiased leading-relaxed tracking-wide whitespace-pre-wrap break-words overflow-x-hidden min-w-0",
    type === "flashcard"
      ? "text-left mb-1 text-white"
      : `block rounded-lg w-full ${
          role === "user"
            ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
            : "bg-textured"
        }`,
    className,
  );

  return (
    <div
      className={`${type === "message" ? "mb-3 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}
    >
      <div className={containerStyles}>{content || "No content available"}</div>
    </div>
  );
};
