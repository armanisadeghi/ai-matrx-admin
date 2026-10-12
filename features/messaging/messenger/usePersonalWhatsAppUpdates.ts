"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { PersonalWhatsAppFailure } from "@/features/social-connections/personal-whatsapp-service";
import type { PersonalMessage, PersonalMessages, PersonalWhatsAppClient } from "@/features/social-connections/personal-whatsapp-service";

export function mergePersonalWhatsAppMessages(previous: PersonalMessage[], incoming: PersonalMessage[], deleted: ReadonlySet<string>): PersonalMessage[] {
  const merged = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) {
    if (message.deleted || deleted.has(message.id)) merged.delete(message.id);
    else merged.set(message.id, message);
  }
  for (const id of deleted) merged.delete(id);
  return [...merged.values()].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
}

export function personalWhatsAppReconcileBatch(ids: readonly string[], cursor: number, limit = 50): { ids: string[]; nextCursor: number } {
  if (ids.length === 0) return { ids: [], nextCursor: 0 };
  const selected = Array.from({ length: Math.min(ids.length, limit) }, (_, offset) => ids[(cursor + offset) % ids.length]);
  return { ids: selected, nextCursor: (cursor + selected.length) % ids.length };
}

/** One read queue and one selected stream; no native token or history is persisted. */
export function usePersonalWhatsAppUpdates({ client, chatId, enabled, messages, setMessages, setPage, onAccessFailure }: {
  client: PersonalWhatsAppClient; chatId: string; enabled: boolean; messages: PersonalMessage[];
  setMessages: Dispatch<SetStateAction<PersonalMessage[]>>; setPage: Dispatch<SetStateAction<PersonalMessages | null>>;
  onAccessFailure: (message: string) => void;
}) {
  const [status, setStatus] = useState("Connecting");
  const [historyReset, setHistoryReset] = useState(false);
  const manualRead = useRef<((cursor?: string) => Promise<void>) | null>(null);
  const loaded = useRef(messages);
  useEffect(() => { loaded.current = messages; }, [messages]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const { signal } = controller;
    const deleted = new Set<string>();
    const pendingIds = new Set<string>();
    const requestedPages: { cursor?: string; resolve: () => void; reject: (cause: unknown) => void }[] = [];
    signal.addEventListener("abort", () => {
      for (const request of requestedPages.splice(0)) request.reject(new DOMException("Conversation closed", "AbortError"));
    }, { once: true });
    let cursor = 0, latest = false, scan = false, reset = false;
    let work: Promise<void> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let periodicTimer: ReturnType<typeof setTimeout> | undefined;
    let backoff = 1000, wasReady = false, streamHealthy = false;

    function drain(): Promise<void> {
      if (work) return work;
      if (signal.aborted) return Promise.resolve();
      const round = performReads();
      work = round;
      void round.then(() => {
        if (work !== round) return;
        work = null;
        if (!signal.aborted && (latest || scan || pendingIds.size > 0 || requestedPages.length > 0)) void drain();
      });
      return round;
    }

    async function performReads() {
      try {
        while (!signal.aborted && (latest || scan || pendingIds.size > 0 || requestedPages.length > 0)) {
          const request = requestedPages.shift();
          if (request) {
            try {
              const page = await client.messages(chatId, request.cursor, signal);
              if (signal.aborted) throw new DOMException("Conversation closed", "AbortError");
              setPage(page);
              setMessages((previous) => mergePersonalWhatsAppMessages(previous, page.items, deleted));
              request.resolve();
            } catch (cause) { request.reject(cause); throw cause; }
            continue;
          }
          const readLatest = latest, readScan = scan, clear = reset;
          latest = false; scan = false; reset = false;
          if (readLatest) {
            const page = await client.messages(chatId, undefined, signal);
            if (signal.aborted) return;
            if (clear) { cursor = 0; setHistoryReset(true); }
            if (clear) setPage(page);
            setMessages((previous) => mergePersonalWhatsAppMessages(clear ? [] : previous, page.items, deleted));
          }
          if (readScan) {
            const batch = personalWhatsAppReconcileBatch(loaded.current.map((message) => message.id).filter((id) => !deleted.has(id)), cursor);
            cursor = batch.nextCursor;
            for (const id of batch.ids) pendingIds.add(id);
          }
          const ids = [...pendingIds].slice(0, 50);
          for (const id of ids) {
            pendingIds.delete(id);
            if (deleted.has(id)) continue;
            const result = await client.message(chatId, id, signal);
            if (signal.aborted) return;
            if (result.message === null) deleted.add(id);
            setMessages((previous) => mergePersonalWhatsAppMessages(previous, result.message ? [result.message] : [], deleted));
          }
        }
        if (!signal.aborted && streamHealthy) setStatus("Updating");
      } catch (cause) {
        if (!signal.aborted) {
          if (cause instanceof PersonalWhatsAppFailure && cause.accessLost) { controller.abort(); onAccessFailure(cause.message); }
          else { setStatus("Reconnecting"); latest = false; scan = false; pendingIds.clear(); }
        }
        for (const request of requestedPages.splice(0)) request.reject(cause);
      }
    }

    function queue({ latestPage = false, scanLoaded = false, resetHistory = false } = {}) {
      latest ||= latestPage; scan ||= scanLoaded; reset ||= resetHistory;
      void drain();
    }

    function schedulePeriodic() {
      periodicTimer = setTimeout(async () => {
        if (signal.aborted) return;
        latest = true; scan = true;
        await drain();
        if (!signal.aborted) schedulePeriodic();
      }, 30_000);
    }

    async function connect() {
      if (signal.aborted) return;
      setStatus(wasReady ? "Reconnecting" : "Connecting");
      try {
        await client.events(chatId, signal, (frame) => {
          if (signal.aborted) return;
          if (frame.type === "ready") {
            const reconnect = wasReady; wasReady = true; streamHealthy = true; backoff = 1000;
            setStatus("Updating"); queue({ latestPage: true, resetHistory: reconnect });
          } else if (frame.type === "access_lost" || frame.change === "chat_deleted") {
            controller.abort(); onAccessFailure("This WhatsApp conversation is unavailable. Check connection.");
          } else if (frame.type === "changed") {
            if (frame.change === "deleted") {
              for (const id of frame.ids ?? []) { deleted.add(id); pendingIds.delete(id); }
              setMessages((previous) => mergePersonalWhatsAppMessages(previous, [], deleted));
            } else if (frame.change === "upsert") {
              // Event IDs can be provisional aliases; only authoritative loaded IDs are looked up.
              latest = true; scan = true;
            }
            // A large burst falls back to bounded authoritative reconciliation.
            if (pendingIds.size > 500) { pendingIds.clear(); scan = true; latest = true; }
            queue({ latestPage: frame.reconcile || frame.change === "reconcile", scanLoaded: frame.reconcile });
          }
        });
      } catch (cause) {
        if (!signal.aborted && cause instanceof PersonalWhatsAppFailure && cause.accessLost) { controller.abort(); onAccessFailure(cause.message); }
        // Transient stream errors leave history and periodic reconciliation available.
      }
      streamHealthy = false;
      if (signal.aborted) return;
      setStatus("Reconnecting");
      reconnectTimer = setTimeout(() => void connect(), backoff);
      backoff = Math.min(backoff * 2, 30_000);
    }

    manualRead.current = (cursor) => new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException("Conversation closed", "AbortError")); return; }
      requestedPages.push({ cursor, resolve, reject }); void drain();
    });
    schedulePeriodic(); void connect();
    return () => {
      manualRead.current = null; controller.abort(); clearTimeout(reconnectTimer); clearTimeout(periodicTimer);
      for (const request of requestedPages.splice(0)) request.reject(new DOMException("Conversation closed", "AbortError"));
    };
  }, [chatId, client, enabled, onAccessFailure, setMessages, setPage]);

  return { status, historyReset, readPage: (cursor?: string) => manualRead.current?.(cursor) ?? Promise.reject(new Error("WhatsApp is not ready. Check connection.")) };
}
