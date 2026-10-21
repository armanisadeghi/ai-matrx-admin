"use client";

/**
 * Home / End move the caret on a Mac too (adv walk 2026-10-21: End did not move it, so text typed after Shift+select + End
 * replaced the selection). Univer binds Home/End to "line start / end" only for Windows and Linux; its Mac binding is
 * Cmd+Left/Right, so on a Mac (and for any Fn+Left/Right, which sends Home/End) the key did nothing. Our own key handling
 * never sees these keys. Added through Univer's own shortcut service with its own cursor operations, same as its other
 * movement shortcuts; Ctrl+Home/End go to the document start/end.
 */
import { Direction, type Univer } from "@univerjs/core";
import { MoveCursorOperation, MoveSelectionOperation, whenDocAndEditorFocused } from "@univerjs/docs-ui";
import { IShortcutService, KeyCode, MetaKeys } from "@univerjs/ui";
import { useEffect, type RefObject } from "react";

type Injector = { get<T>(token: unknown): T };

export const isMacPlatform = (): boolean => typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || navigator.userAgent);

/** The shortcuts Univer leaves unbound on a Mac. */
export function macHomeEndShortcuts() {
  const row = (id: string, binding: number, direction: Direction, granularity: "line" | "document") => ({
    id,
    binding,
    mac: binding,
    preconditions: whenDocAndEditorFocused,
    staticParameters: { direction, granularity },
  });
  const move = MoveCursorOperation.id;
  const select = MoveSelectionOperation.id;
  return [
    row(move, KeyCode.HOME, Direction.LEFT, "line"),
    row(move, KeyCode.END, Direction.RIGHT, "line"),
    row(select, KeyCode.HOME | MetaKeys.SHIFT, Direction.LEFT, "line"),
    row(select, KeyCode.END | MetaKeys.SHIFT, Direction.RIGHT, "line"),
    row(move, KeyCode.HOME | MetaKeys.MAC_CTRL, Direction.UP, "document"),
    row(move, KeyCode.END | MetaKeys.MAC_CTRL, Direction.DOWN, "document"),
  ];
}

export function useMacHomeEndKeys(univerRef: RefObject<Univer | null>, ready: boolean): void {
  useEffect(() => {
    const univer = univerRef.current;
    if (!univer || !ready || !isMacPlatform()) return undefined;
    const injector = (univer as unknown as { __getInjector?: () => Injector }).__getInjector?.();
    if (!injector) return undefined;
    const service = injector.get<{ registerShortcut(s: unknown): { dispose(): void } }>(IShortcutService);
    const disposables = macHomeEndShortcuts().map((s) => service.registerShortcut(s));
    return () => {
      for (const d of disposables) d.dispose();
    };
  }, [univerRef, ready]);
}
