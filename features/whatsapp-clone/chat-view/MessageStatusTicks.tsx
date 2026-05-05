import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import type { WAMessageStatus } from "../types";

interface MessageStatusTicksProps {
  status: WAMessageStatus;
  className?: string;
}

export function MessageStatusTicks({
  status,
  className,
}: MessageStatusTicksProps) {
  const cls = cn("h-3.5 w-3.5 shrink-0", className);
  switch (status) {
    case "sending":
      return <Clock className={cn(cls, "opacity-70")} aria-label="Sending" />;
    case "sent":
      return <Check className={cn(cls, "opacity-70")} aria-label="Sent" />;
    case "delivered":
      return (
        <CheckCheck className={cn(cls, "opacity-70")} aria-label="Delivered" />
      );
    case "read":
      return (
        <CheckCheck className={cn(cls, "text-sky-500")} aria-label="Read" />
      );
    case "failed":
      return (
        <AlertCircle
          className={cn(cls, "text-rose-500")}
          aria-label="Failed"
        />
      );
    default:
      return null;
  }
}
