import { AlertCircle } from "lucide-react";

export function AssistantError({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-3 py-2 mt-1">
      <div className="shrink-0 w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5 animate-pulse">
        <AlertCircle className="w-4 h-4 text-destructive" />
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-medium text-destructive/90">{error}</span>
        <div className="h-[3px] w-24 rounded-full overflow-hidden bg-destructive/10">
          <div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--destructive) / 0.3) 0%, hsl(var(--destructive) / 0.8) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
