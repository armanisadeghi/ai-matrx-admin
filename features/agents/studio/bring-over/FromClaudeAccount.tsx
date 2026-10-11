"use client";

/**
 * Mode "Bring it over from my Claude account". The person uploads the export claude.ai emails them
 * (Settings, Privacy, Export data) or pastes a chat; we list its conversations (and projects, when the
 * export has them); they pick one and may add project instructions or skill text; the Studio's
 * from-chat door builds through the Agent Factory. We never sign in to Claude for anyone.
 */

import { useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useFileUpload } from "@/features/files/handler/hooks/useFileUpload";
import { previewExport, type ExportPreview } from "./bring-over-api";
import { BuildFromImport } from "./BuildFromImport";

type Source = { file_id: string } | { text: string };

export function FromClaudeAccount() {
  const dispatch = useAppDispatch();
  const { upload } = useFileUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [conversationKey, setConversationKey] = useState<string | null>(null);
  const [projectKey, setProjectKey] = useState<string>("");
  const [context, setContext] = useState("");

  const read = async () => {
    setBusy(true);
    try {
      let src: Source;
      if (file) {
        const uploaded = await upload(
          { kind: "file", file },
          { folderPath: "Agent Studio/Claude Imports", fileName: file.name, metadata: { sourceFeature: "agent-studio" } },
        );
        src = { file_id: uploaded.fileId };
      } else {
        src = { text };
      }
      const result = await previewExport(dispatch, src);
      setSource(src);
      setPreview(result);
      setConversationKey(result.conversations[0]?.key ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that export.");
    } finally {
      setBusy(false);
    }
  };

  const canRead = Boolean(file) || text.trim().length >= 40;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4" data-testid="from-claude-account">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Bring it over from my Claude account</h1>
        <p className="text-sm text-muted-foreground">
          Pick a conversation (and a project, if you have one) and we build an agent that does what it did.
        </p>
      </header>

      {!preview ? (
        <section className="space-y-4" aria-label="Your export">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>On claude.ai (web or desktop), open Settings, then Privacy, then Export data.</li>
            <li>Claude emails you a link. It works for 24 hours.</li>
            <li>Upload the zip here. Phone apps cannot export, and Claude cannot export a Project on its own, so paste a project's instructions below.</li>
          </ol>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.json,.jsonl,.txt,.md"
            className="hidden"
            data-testid="export-file-input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-card p-2.5 text-sm">
              <span className="min-w-0 truncate font-medium">{file.name}</span>
              <Button variant="outline" onClick={() => setFile(null)} aria-label="Remove file">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileUp className="mr-2 h-4 w-4" />
              Choose your export
            </Button>
          )}
          {!file ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="pasted-chat">
                Or paste a chat
              </label>
              <Textarea
                id="pasted-chat"
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the conversation from claude.ai"
              />
            </div>
          ) : null}
          <Button onClick={read} disabled={!canRead || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Read it
          </Button>
          {!canRead ? <p className="text-sm text-muted-foreground">Choose your export, or paste at least 40 characters.</p> : null}
        </section>
      ) : (
        <section className="space-y-5" aria-label="Pick what to turn into an agent">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Which conversation shows the job done well?</legend>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-1">
              {preview.conversations.map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent has-[:checked]:bg-accent"
                >
                  <input
                    type="radio"
                    name="conversation"
                    className="mt-1"
                    checked={conversationKey === c.key}
                    onChange={() => setConversationKey(c.key)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.title || "Untitled"}</span>
                    <span className="text-xs text-muted-foreground">{c.turns} messages</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {preview.projects.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project">
                Did this chat happen inside a project?
              </label>
              <select
                id="project"
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
              >
                <option value="">No project</option>
                {preview.projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.files.length} files)
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="context">
              Project instructions, skills or custom instructions (optional)
            </label>
            <Textarea
              id="context"
              rows={5}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Paste anything that shaped how Claude did this job"
            />
          </div>

          <BuildFromImport
            disabled={!conversationKey}
            disabledReason="Pick a conversation first."
            source={{
              ...(source ?? {}),
              key: conversationKey ?? undefined,
              ...(projectKey ? { project_key: projectKey } : {}),
              ...(context.trim() ? { extra_context: context.trim() } : {}),
            }}
          />
          <Button variant="outline" onClick={() => setPreview(null)}>
            Use a different export
          </Button>
        </section>
      )}
    </div>
  );
}
