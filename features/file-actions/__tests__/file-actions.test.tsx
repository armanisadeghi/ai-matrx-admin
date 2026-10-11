/**
 * The shared file-actions layer (workbooks + documents lists AND editors).
 * Each case is one way the layer could silently stop doing its job:
 *  - a failed trash / restore / copy / move / download says so and does not
 *    carry on as if it worked (the editor used to navigate after a failed Undo);
 *  - only the owner is offered Rename / Move / Trash / Restore;
 *  - the scope tabs filter by owner and star, never by guess.
 * Proven failing first: removing the `isServiceFailure` branch in ops.ts, the
 * `canManage` gate in FileMenuItems, or swapping filterByScope's shared/mine cases turns these red.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileMenuItems, type FileMenuItemsProps } from "../FileMenuItems";
import { filterByScope } from "../FileScopeBar";
import { copyRecord, moveRecord, restoreRecord, runDownload, trashRecord } from "../ops";
import type { FileKindAdapter } from "../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const toastCalls: Array<{ kind: string; message: string; opts?: { action?: { onClick: () => void } } }> = [];
jest.mock("@/lib/toast", () => ({
  toast: {
    success: (message: string, opts?: unknown) =>
      toastCalls.push({ kind: "success", message, opts: opts as never }),
    error: (message: string, opts?: unknown) =>
      toastCalls.push({ kind: "error", message, opts: opts as never }),
  },
}));
jest.mock("@/components/dialogs/value-prompts/ValuePromptsDialogHost", () => ({
  promptForValues: async () => null,
}));

const ok = <T,>(data: T) => ({ success: true as const, data });
const bad = (error: string) => ({ success: false as const, error });

function adapter(over: Partial<FileKindAdapter<{ id: string; user_id: string }>> = {}) {
  return {
    noun: "workbook",
    resourceType: "workbook",
    entityType: "workbook",
    nameOf: () => "Q3",
    projectIdOf: () => null,
    hrefFor: (id: string) => `/workbooks/${id}`,
    rename: async () => ok(null),
    copy: async () => ok({ id: "new-1" }),
    move: async () => ok(null),
    trash: async () => ok(null),
    restore: async () => ok(null),
    downloads: () => [],
    ...over,
  } as FileKindAdapter<{ id: string; user_id: string }>;
}

beforeEach(() => {
  toastCalls.length = 0;
});

describe("file ops never fail silently", () => {
  it("a failed trash says so and does not report the record as gone", async () => {
    const onTrashed = jest.fn();
    const done = await trashRecord(adapter({ trash: async () => bad("denied") }), "w1", "Q3", { onTrashed });
    expect(done).toBe(false);
    expect(onTrashed).not.toHaveBeenCalled();
    expect(toastCalls.some((t) => t.kind === "error" && /move to trash/.test(t.message))).toBe(true);
  });

  it("Undo after trash restores, and a FAILED restore is reported and never navigates", async () => {
    const onRestored = jest.fn();
    await trashRecord(adapter({ restore: async () => bad("nope") }), "w1", "Q3", { onRestored });
    const undo = toastCalls.find((t) => t.kind === "success")?.opts?.action;
    expect(undo).toBeTruthy();
    undo!.onClick();
    await new Promise((r) => setTimeout(r, 0));
    expect(onRestored).not.toHaveBeenCalled();
    expect(toastCalls.some((t) => t.kind === "error" && /restore/.test(t.message))).toBe(true);
  });

  it("Undo with a working restore calls onRestored", async () => {
    const onRestored = jest.fn();
    await trashRecord(adapter(), "w1", "Q3", { onRestored });
    toastCalls.find((t) => t.kind === "success")!.opts!.action!.onClick();
    await new Promise((r) => setTimeout(r, 0));
    expect(onRestored).toHaveBeenCalledTimes(1);
  });

  it("copy returns the new id, or null with an error toast", async () => {
    expect(await copyRecord(adapter(), "w1", "Q3")).toBe("new-1");
    toastCalls.length = 0;
    expect(await copyRecord(adapter({ copy: async () => bad("no org") }), "w1", "Q3")).toBeNull();
    expect(toastCalls[0]?.kind).toBe("error");
  });

  it("move and restore report failure", async () => {
    expect(await moveRecord(adapter({ move: async () => bad("x") }), "w1", "p1", "Proj")).toBe(false);
    expect(await restoreRecord(adapter({ restore: async () => bad("x") }), "w1", "Q3")).toBe(false);
    expect(toastCalls.filter((t) => t.kind === "error")).toHaveLength(2);
  });

  it("a download that throws is reported with its format", async () => {
    await runDownload(adapter(), {
      label: "PDF",
      run: async () => {
        throw new Error("no content");
      },
    });
    expect(toastCalls[0]).toMatchObject({ kind: "error" });
    expect(toastCalls[0]?.message).toMatch(/PDF/);
  });
});

describe("filterByScope", () => {
  const rows = [
    { id: "a", user_id: "me" },
    { id: "b", user_id: "other" },
  ];
  it("splits owned from shared and picks stars", () => {
    expect(filterByScope(rows, "mine", "me", new Set()).map((r) => r.id)).toEqual(["a"]);
    expect(filterByScope(rows, "shared", "me", new Set()).map((r) => r.id)).toEqual(["b"]);
    expect(filterByScope(rows, "starred", "me", new Set(["b"])).map((r) => r.id)).toEqual(["b"]);
    expect(filterByScope(rows, "all", "me", new Set())).toHaveLength(2);
  });
});

describe("FileMenuItems gating", () => {
  function labelsFor(props: Partial<FileMenuItemsProps>): string[] {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <DropdownMenu open>
          <DropdownMenuTrigger>t</DropdownMenuTrigger>
          <DropdownMenuContent>
            <FileMenuItems
              name="Q3"
              canManage={false}
              onShare={() => undefined}
              onToggleStar={() => undefined}
              onRename={() => undefined}
              onCopy={() => undefined}
              onMoveRequest={() => undefined}
              onTrash={() => undefined}
              onRestore={() => undefined}
              {...props}
            />
          </DropdownMenuContent>
        </DropdownMenu>,
      );
    });
    const labels = [...document.body.querySelectorAll('[role="menuitem"]')].map((n) => n.textContent ?? "");
    act(() => root.unmount());
    host.remove();
    return labels;
  }

  it("a non-owner gets Share, Star and Make a copy - nothing destructive", () => {
    const labels = labelsFor({ canManage: false });
    expect(labels).toEqual(expect.arrayContaining(["Share", "Star", "Make a copy"]));
    for (const hidden of ["Rename", "Move to project", "Move to trash"]) expect(labels).not.toContain(hidden);
  });

  it("the owner also gets Rename, Move and Trash", () => {
    const labels = labelsFor({ canManage: true });
    expect(labels).toEqual(expect.arrayContaining(["Rename", "Move to project", "Move to trash"]));
  });

  it("Trash view: Restore for the owner only", () => {
    expect(labelsFor({ canManage: true, trashed: true })).toEqual(["Restore"]);
    expect(labelsFor({ canManage: false, trashed: true })).toEqual([]);
  });
});
