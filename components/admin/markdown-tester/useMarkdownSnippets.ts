"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "markdown-tester";
const DB_VERSION = 1;
const STORE_NAME = "snippets";
const AUTOSAVE_KEY = "__autosave__";
const AUTOSAVE_DEBOUNCE_MS = 1000;

export interface MarkdownSnippet {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isAutosave?: boolean;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-updated", "updatedAt");
        store.createIndex("by-name", "name");
      }
    },
  });
}

export function useMarkdownSnippets(currentContent: string) {
  const [snippets, setSnippets] = useState<MarkdownSnippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbRef = useRef<IDBPDatabase | null>(null);

  const ensureDb = useCallback(async () => {
    if (!dbRef.current) dbRef.current = await getDb();
    return dbRef.current;
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const db = await ensureDb();
      const all: MarkdownSnippet[] = await db.getAll(STORE_NAME);
      const saved = all
        .filter((s) => !s.isAutosave)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      setSnippets(saved);
    } catch (err) {
      console.error("[MarkdownSnippets] Failed to load snippets:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ensureDb]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Autosave on content changes (debounced)
  useEffect(() => {
    if (!currentContent.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const db = await ensureDb();
        const now = Date.now();
        await db.put(STORE_NAME, {
          id: AUTOSAVE_KEY,
          name: "Autosave",
          content: currentContent,
          createdAt: now,
          updatedAt: now,
          isAutosave: true,
        });
      } catch (err) {
        console.error("[MarkdownSnippets] Autosave failed:", err);
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentContent, ensureDb]);

  const loadAutosave = useCallback(async (): Promise<string | null> => {
    try {
      const db = await ensureDb();
      const record: MarkdownSnippet | undefined = await db.get(
        STORE_NAME,
        AUTOSAVE_KEY,
      );
      return record?.content ?? null;
    } catch {
      return null;
    }
  }, [ensureDb]);

  const saveSnippet = useCallback(
    async (name: string): Promise<void> => {
      if (!name.trim() || !currentContent.trim()) return;
      const db = await ensureDb();
      const now = Date.now();
      const id = `snippet-${now}`;
      await db.put(STORE_NAME, {
        id,
        name: name.trim(),
        content: currentContent,
        createdAt: now,
        updatedAt: now,
        isAutosave: false,
      });
      await refreshList();
    },
    [currentContent, ensureDb, refreshList],
  );

  const loadSnippet = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        const db = await ensureDb();
        const record: MarkdownSnippet | undefined = await db.get(
          STORE_NAME,
          id,
        );
        return record?.content ?? null;
      } catch {
        return null;
      }
    },
    [ensureDb],
  );

  const deleteSnippet = useCallback(
    async (id: string): Promise<void> => {
      try {
        const db = await ensureDb();
        await db.delete(STORE_NAME, id);
        await refreshList();
      } catch (err) {
        console.error("[MarkdownSnippets] Delete failed:", err);
      }
    },
    [ensureDb, refreshList],
  );

  const renameSnippet = useCallback(
    async (id: string, newName: string): Promise<void> => {
      try {
        const db = await ensureDb();
        const record: MarkdownSnippet | undefined = await db.get(
          STORE_NAME,
          id,
        );
        if (!record) return;
        await db.put(STORE_NAME, {
          ...record,
          name: newName.trim(),
          updatedAt: Date.now(),
        });
        await refreshList();
      } catch (err) {
        console.error("[MarkdownSnippets] Rename failed:", err);
      }
    },
    [ensureDb, refreshList],
  );

  return {
    snippets,
    isLoading,
    saveSnippet,
    loadSnippet,
    loadAutosave,
    deleteSnippet,
    renameSnippet,
    refreshList,
  };
}
