import React, { useEffect, useState } from "react";
import { History, X } from "lucide-react";
import { getDraftTranscripts } from "@/features/transcripts/service/transcriptsService";
import { Transcript } from "@/features/transcripts/types";

export function VoicePadHistorySidebar({
  onClose,
  onSelectTranscript
}: {
  onClose: () => void;
  onSelectTranscript: (text: string) => void;
}) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDraftTranscripts(20)
      .then(data => {
        setTranscripts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load transcripts history", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-[180px] border-l border-border/30 bg-muted/5 flex flex-col min-h-0 shrink-0">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/30 bg-muted/10 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80">
          <History className="h-3 w-3" />
          <span>History</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-accent"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {loading ? (
          <div className="text-[10px] text-muted-foreground text-center py-4 animate-pulse">Loading...</div>
        ) : transcripts.length === 0 ? (
          <div className="text-[10px] text-muted-foreground text-center py-4">No history found</div>
        ) : (
          transcripts.map((t) => {
            const rawText = t.segments?.map(s => s.text).join(" ") || "";
            return (
              <button
                key={t.id}
                onClick={() => onSelectTranscript(rawText)}
                className="w-full text-left p-1.5 rounded-md hover:bg-accent/40 transition-colors group block"
                title={rawText}
              >
                <div className="text-[10px] font-medium text-foreground/80 line-clamp-1 leading-tight">
                  {t.title || 'Recording'}
                </div>
                <div className="text-[9px] text-muted-foreground/60 line-clamp-2 mt-0.5 leading-tight">
                  {rawText || 'No content...'}
                </div>
                <div className="text-[8px] text-muted-foreground/40 mt-1 tabular-nums">
                  {new Date(t.created_at || t.draft_saved_at || '').toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  );
}
