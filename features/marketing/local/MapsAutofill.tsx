"use client";

// "Fill from Google Maps" for a location's canonical profile. Paste the place's
// Google Maps link (or its place id); the live record maps to the same suggestion
// chips the profile already shows - nothing is saved until the person hits Save.
// The price is quoted in points on the button, and nothing runs without a click.

import { useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { FetchProgress } from "@/features/data-sources/FetchProgress";
import { useSourceLookup } from "@/features/data-sources/useSourceLookup";
import { observedFromPlaceRecord, placeLookupUrl, placeRatingWords } from "./profile-autofill";

export function MapsAutofill({
  locationId,
  organizationId,
  onFound,
}: {
  locationId: string;
  organizationId: string;
  onFound: (observed: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const lookup = useSourceLookup({
    organizationId,
    sourceKey: "google_maps_place",
    runKey: `local-maps-autofill:${locationId}`,
    tableName: "Google Maps places",
  });
  const running = lookup.run.status === "running";
  const url = placeLookupUrl(text);
  const price = lookup.quote ?? "…";

  const fill = () => {
    if (!url) return;
    setNote(null);
    lookup.start(url, (record) => {
      const observed = record ? observedFromPlaceRecord(record) : {};
      if (!record || Object.keys(observed).length === 0) {
        toast.error("Google Maps returned nothing we could read for that place.");
        return;
      }
      onFound(observed);
      const rating = placeRatingWords(record);
      setNote(`Found ${Object.keys(observed).length} fields${rating ? ` · ${rating}` : ""}. Review them below, then Save.`);
    });
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" className="mb-2 gap-1" onClick={() => setOpen(true)}>
        <MapPin className="h-3.5 w-3.5" />
        Fill from Google Maps
      </Button>
    );
  }
  return (
    <div className="mb-2 rounded-md border border-border p-2" data-testid="maps-autofill">
      <div className="flex flex-wrap items-center gap-1.5">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the Google Maps link or place id"
          className="min-w-48 flex-1"
          aria-label="Google Maps link or place id"
        />
        <Button type="button" variant="primary" disabled={!url || running || !lookup.source} onClick={fill}>
          {running ? "Getting…" : `Fill from Google Maps · ${price}`}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={running}>
          Close
        </Button>
      </div>
      {text.trim() !== "" && !url ? (
        <p className="mt-1 text-[11px] text-muted-foreground">That is not a Google Maps place link or a place id.</p>
      ) : null}
      {lookup.run.status === "running" ? <FetchProgress label="Google Maps place" progress={lookup.run.progress} startedAt={lookup.run.startedAt} /> : null}
      {lookup.run.status === "failed" ? (
        <p className="mt-1 text-[11px] text-destructive" role="alert">
          {lookup.run.refusal.userMessage}{" "}
          <button type="button" className="underline" onClick={lookup.dismiss}>
            Dismiss
          </button>
        </p>
      ) : null}
      {note ? <p className="mt-1 text-[11px] text-foreground">{note}</p> : null}
    </div>
  );
}
