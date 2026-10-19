/**
 * A proposal's full detail — its state sentences, body and review card — lives
 * in the row's window, opened by a row click (one line per proposal in the list).
 * Tests that read that detail open the row first, as the person does, and read
 * the whole document (the window renders outside the queue's container).
 */
import { act } from "react";

export async function openApprovalRow(
  container: HTMLElement,
  key?: string,
): Promise<void> {
  const selector = key ? `tr[data-row-id="${CSS.escape(key)}"]` : "tbody tr[data-row-id]";
  const row = container.querySelector<HTMLElement>(selector);
  if (!row) throw new Error(`No approval row ${key ?? "(first)"} to open`);
  // The What cell (the headline) — a plain cell, never a checkbox or a door.
  const cell = row.querySelector<HTMLElement>("span[title]") ?? row;
  await act(async () => {
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

/** Every visible word on the page, the open window included. */
export function pageText(): string {
  return document.body.textContent ?? "";
}

/** Every button label on the page, the open window included. */
export function pageButtonLabels(): string[] {
  return [...document.body.querySelectorAll("button")].map(
    (button) => button.textContent ?? "",
  );
}
