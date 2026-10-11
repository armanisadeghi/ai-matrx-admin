/**
 * Lane SHARE-DIALOG-2.
 *
 * 1. ZERO LAYOUT SHIFT (Arman 2026-10-07), measured on a custom table's Share dialog: changing
 *    "Shown to" measured CLS 0.033 (two shifts of 88px). Cause: every dialog action raised
 *    `loading`, and the grant list swapped itself for an 88px-shorter spinner box, so the add-a-person
 *    form and the organization line jumped and jumped back. Also the sentence under "Shown to"
 *    changes per choice and wraps differently on a phone. Structural guards: a re-read keeps the rows
 *    mounted; the first-read stand-in holds the empty state's height; the sentence slot holds every
 *    sentence in one grid cell.
 * 2. A member holding Edit saw "Not shared with anyone" over their own active grant:
 *    public.get_resource_permissions answered an empty list to anyone below Admin. The dialog now
 *    renders what the door returns for a member; the door's migration keeps the member branch.
 */

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/utils/permissions/shareLinks", () => ({
  getShareCapabilities: async () => ({
    isLinkShareable: true,
    rowControls: true,
    shownToOffered: true,
    publishLane: null,
    tableLevel: "organization",
  }),
}));
jest.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock("@/features/sharing/indexed/SearchEngineIndexedSwitch", () => ({
  SearchEngineIndexedSwitch: () => <span data-indexed-switch />,
}));

import { PermissionsList } from "@/features/sharing/components/PermissionsList";
import { RowControls } from "@/features/sharing/components/RowControls";
import { SHOWN_TO_ORDER, SHOWN_TO_WORDS } from "@/lib/list-scope/shownToWords";
import type { PermissionWithDetails } from "@/utils/permissions/types";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const noop = async () => ({ success: true }) as never;

const memberGrant: PermissionWithDetails = {
  id: "9a1d0c2b-3e4f-4a5b-9c6d-7e8f9a0b1c2d",
  resourceType: "record" as never,
  resourceId: "32bb1a91-362c-40e8-bd05-0e9f003a1e44",
  grantedToUserId: "4060701e-706a-4c76-b3ca-0bbc69fa5a14",
  permissionLevel: "editor",
  grantedToUser: { id: "4060701e-706a-4c76-b3ca-0bbc69fa5a14", email: "test@test.com", displayName: "test" },
};

const list = (permissions: PermissionWithDetails[], loading: boolean, isOwner = false) =>
  act(async () => {
    root.render(
      <PermissionsList permissions={permissions} isOwner={isOwner} loading={loading} onUpdateLevel={noop} onRevoke={noop} />,
    );
  });

describe("the grant list never changes height because it is being re-read", () => {
  it("keeps the rows mounted while a re-read is in flight", async () => {
    await list([memberGrant], false);
    expect(host.textContent).toContain("test@test.com");
    await list([memberGrant], true);
    expect(host.textContent).toContain("test@test.com");
    expect(host.querySelector('[data-grants-busy="true"]')).not.toBeNull();
    expect(host.querySelector("[data-grants-reserved]")).toBeNull();
  });

  it("the first-read stand-in and the empty state hold the same height", async () => {
    await list([], true);
    const standIn = host.querySelector("[data-grants-reserved]");
    expect(standIn).not.toBeNull();
    const standInHeight = [...standIn!.classList].find((c) => c.startsWith("min-h-"));
    expect(standInHeight).toBeTruthy();
    await list([], false);
    const empty = host.querySelector("[data-grants-empty]");
    expect(empty).not.toBeNull();
    expect([...empty!.classList]).toContain(standInHeight);
  });
});

describe("the sentence under 'Shown to' is a fixed slot", () => {
  const draw = (shownTo: Parameters<typeof RowControls>[0]["shownTo"]) =>
    act(async () => {
      root.render(
        <RowControls
          resourceType={"record" as never}
          resourceId="32bb1a91-362c-40e8-bd05-0e9f003a1e44"
          canChange
          shownTo={shownTo}
          isPublic={false}
          publishable={false}
          onSetShownTo={noop}
          onPublish={noop}
          onStopPublishing={noop}
        />,
      );
    });

  it("holds every sentence in one grid cell, only the current one visible", async () => {
    await draw("only_me");
    const slot = host.querySelector("[data-shown-to-says-slot]")!;
    expect(slot.classList).toContain("grid");
    const sentences = [...slot.querySelectorAll("[data-shown-to-says]")];
    // every choice + the "not set" sentence, always mounted
    expect(sentences).toHaveLength(SHOWN_TO_ORDER.length + 1);
    for (const p of sentences) {
      expect(p.className).toContain("col-start-1");
      expect(p.className).toContain("row-start-1");
    }
    const visible = sentences.filter((p) => !p.classList.contains("invisible"));
    expect(visible).toHaveLength(1);
    expect(visible[0]!.textContent).toContain(SHOWN_TO_WORDS.only_me.says);
  });

  it("changing the choice swaps which sentence shows and never the slot's children", async () => {
    await draw("only_me");
    const before = host.querySelectorAll("[data-shown-to-says]").length;
    await draw("my_team");
    await draw("everyone");
    await draw(null);
    expect(host.querySelectorAll("[data-shown-to-says]").length).toBe(before);
    const visible = [...host.querySelectorAll("[data-shown-to-says]")].filter((p) => !p.classList.contains("invisible"));
    expect(visible.map((p) => p.getAttribute("data-shown-to-says"))).toEqual(["default"]);
  });
});

describe("a member sees the grants the door returns for them", () => {
  it("renders the member's own Edit grant, never 'Not shared with anyone'", async () => {
    await list([memberGrant], false, false);
    expect(host.textContent).toContain("test@test.com");
    expect(host.textContent).not.toContain("Not shared with anyone");
    expect(host.querySelector("[data-grants-empty]")).toBeNull();
  });

  it("the list door answers a non-manager with their own grants and those at or below their level", () => {
    const sql = readFileSync(join(process.cwd(), "migrations/share_list_shows_a_member_what_they_may_see.sql"), "utf8");
    // The old body returned nothing unless the caller could manage sharing.
    expect(sql).not.toMatch(/IF NOT public\.may_manage_sharing\([^)]*\) THEN RETURN;/);
    expect(sql).toContain("perm.granted_to_user_id = v_uid");
    expect(sql).toContain("perm.permission_level <= v_cap");
  });
});
