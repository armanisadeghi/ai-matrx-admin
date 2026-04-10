"use client";

// Minimal context to share instanceId across the notes component tree.
// Avoids prop drilling instanceId through every layer while keeping
// the zero-prop-drilling Redux architecture intact.

import { createContext, useContext } from "react";

const NotesInstanceContext = createContext<string | null>(null);

export const NotesInstanceProvider = NotesInstanceContext.Provider;

export function useNotesInstanceId(): string {
  const id = useContext(NotesInstanceContext);
  if (!id) throw new Error("useNotesInstanceId must be used within NotesInstanceProvider");
  return id;
}
