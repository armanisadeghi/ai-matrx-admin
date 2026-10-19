"use client";

// features/shell/current-record/currentRecord.ts — THE CURRENT RECORD (custom-experience PLAN §5.4).
//
// "Which record is this page showing?" answered synchronously, for any page. A record page declares it
// once — `EntityModeHeader` / `RecordPageHeader` declare the name they already show (with `token`/`id`
// when the caller passes `record.token` / `record.id`), and a route that knows the record id but draws
// another header mounts `<DeclareCurrentRecord token id />` (the agent layout does). Readers —
// "Add to my menu", and anything else that wants the record a person is looking at — call
// `useCurrentRecord()` and get `{ token, id, label }` merged from every live declaration, or null.
//
// A declaration lives exactly as long as the component that made it (unmount = gone), so a stale record
// never leaks onto the next page. No React context needed: one module store, read with
// useSyncExternalStore.

import { useEffect, useSyncExternalStore } from "react";

export interface CurrentRecord {
  /** Entity type token (`agent`, `note`…); null when the page named the record but not its type. */
  token: string | null;
  id: string | null;
  /** The name the page shows for it; null when only the id is known. */
  label: string | null;
}

export interface CurrentRecordDeclaration {
  token?: string | null;
  id?: string | null;
  label?: string | null;
}

const declarations: Array<{ key: number; value: CurrentRecordDeclaration }> = [];
const listeners = new Set<() => void>();
let snapshot: CurrentRecord | null = null;
let nextKey = 0;

function recompute(): void {
  let token: string | null = null;
  let id: string | null = null;
  let label: string | null = null;
  // Newest declaration wins per field (a header's name, a layout's id).
  for (const { value } of declarations) {
    if (value.token) token = value.token;
    if (value.id) id = value.id;
    if (value.label) label = value.label;
  }
  snapshot = token || id || label ? { token, id, label } : null;
  for (const listener of listeners) listener();
}

/** Declare (part of) the current record; returns the release. Prefer the hook / component. */
export function declareCurrentRecord(value: CurrentRecordDeclaration): () => void {
  const key = nextKey++;
  declarations.push({ key, value });
  recompute();
  return () => {
    const at = declarations.findIndex((d) => d.key === key);
    if (at !== -1) declarations.splice(at, 1);
    recompute();
  };
}

export function peekCurrentRecord(): CurrentRecord | null {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The record this page shows, or null. */
export function useCurrentRecord(): CurrentRecord | null {
  return useSyncExternalStore(subscribe, peekCurrentRecord, () => null);
}

/** Declare the current record for as long as the caller is mounted. */
export function useDeclareCurrentRecord(value: CurrentRecordDeclaration | null): void {
  const token = value?.token ?? null;
  const id = value?.id ?? null;
  const label = value?.label ?? null;
  useEffect(() => {
    if (!token && !id && !label) return;
    return declareCurrentRecord({ token, id, label });
  }, [token, id, label]);
}

/** The component form, for server layouts that know the record (e.g. `/agents/[id]`). */
export function DeclareCurrentRecord(props: CurrentRecordDeclaration): null {
  useDeclareCurrentRecord(props);
  return null;
}
