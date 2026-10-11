"use client";

/**
 * The Google row at the top of the Workbooks and Documents homes.
 * Not connected → one attractive connect card. Connected → Import front and
 * center, with the linked files one click from Google. Holds its height while
 * it resolves, so the list below never jumps.
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge, Button, PromoBanner } from "@ai-matrx/design-system/controls";

import { errorSentence, toast } from "@/lib/toast";

import { GoogleDocsMark, GoogleSheetsMark } from "./marks";
import { importGoogleDocAsDocument, importGoogleSheetAsWorkbook } from "./importers";
import { useGoogleWorkspaceConnection } from "./useGoogleWorkspaceConnection";
import type { GoogleFileLink } from "./link-store";

export interface LinkedItem {
  id: string;
  name: string;
  link: GoogleFileLink;
}

export function GoogleHomeStrip({
  kind,
  linked,
  onImported,
}: {
  kind: "workbook" | "document";
  linked: LinkedItem[];
  onImported: (id: string) => void;
}) {
  const { state, connect, refresh } = useGoogleWorkspaceConnection();
  const [importing, setImporting] = useState(false);
  const isSheet = kind === "workbook";
  const Mark = isSheet ? GoogleSheetsMark : GoogleDocsMark;
  const app = isSheet ? "Google Sheets" : "Google Docs";
  const tone = isSheet ? "success" : "info";

  if (state.status === "loading") {
    return <div className="h-14" aria-hidden="true" />;
  }

  if (state.status === "error") {
    return (
      <PromoBanner
        icon={<Mark />}
        tone="warning"
        eyebrow={app}
        title="Couldn't check your Google connection"
        line={state.error.slice(0, 60)}
        action={<Button variant="outline" onClick={refresh}>Retry</Button>}
        aria-label={app}
      />
    );
  }

  if (state.status === "none") {
    return (
      <PromoBanner
        icon={<Mark />}
        tone={tone}
        eyebrow={app}
        title={isSheet ? "Bring your Google Sheets in" : "Bring your Google Docs in"}
        line={isSheet ? "Import, push and keep workbooks in step" : "Import, push and keep documents in step"}
        action={
          <Button variant="primary" onClick={() => connect(`to use ${app} with your ${kind}s`)}>
            Connect Google
          </Button>
        }
        aria-label={app}
      />
    );
  }

  const runImport = async () => {
    setImporting(true);
    try {
      const outcome = isSheet
        ? await importGoogleSheetAsWorkbook(state.connection)
        : await importGoogleDocAsDocument(state.connection);
      if (outcome) {
        toast.success(`Imported “${outcome.name}”`);
        onImported(outcome.id);
      }
    } catch (error: unknown) {
      toast.error(errorSentence(error));
    } finally {
      setImporting(false);
    }
  };

  const recent = [...linked]
    .sort((a, b) => (b.link.lastSyncedAt ?? "").localeCompare(a.link.lastSyncedAt ?? ""))
    .slice(0, 3);

  return (
    <PromoBanner
      icon={<Mark />}
      tone={tone}
      eyebrow={state.connection.accountEmail ?? app}
      title={isSheet ? "Import from Google Sheets" : "Import from Google Docs"}
      line={
        recent.length === 0
          ? isSheet
            ? "Pick a Sheet; it opens here, linked both ways"
            : "Pick a Doc; it opens here, linked both ways"
          : `${linked.length} linked`
      }
      chips={
        recent.length > 0 ? (
          <>
            {recent.map((item) => (
              <a key={item.id} href={item.link.webViewLink ?? "#"} target="_blank" rel="noopener noreferrer" title={`Open ${item.link.name} in ${app}`}>
                <Badge>{item.name}</Badge>
              </a>
            ))}
          </>
        ) : undefined
      }
      action={
        <Button
          variant="primary"
          icon={importing ? <Loader2 className="animate-spin" /> : undefined}
          disabled={importing}
          onClick={() => void runImport()}
        >
          Import
        </Button>
      }
      aria-label={app}
    />
  );
}
