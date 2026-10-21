/**
 * The host-values channel (features/mandates/host-values) and its site guard.
 *
 * GUARD: every site in HOST_VALUE_SITES marked `wired` must hand its provision
 * to the channel in its own file, the assist launch must carry the mandate key
 * and provide the chip's values, and the `open` list may only shrink. Proven
 * RED against the producers before they sent `hostValues` (2026-10-18).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

jest.mock("@ai-matrx/chat/host/conversation-hooks", () => ({
  ...jest.requireActual("@ai-matrx/chat/host/conversation-hooks"),
  getConversationHooks: () => undefined,
  registerConversationHooks: () => () => undefined,
}));
jest.mock("@ai-matrx/chat/store/store-singleton", () => ({ getStoreSingleton: () => null }));

import {
  hostValuesForTurn,
  presentHostValues,
  provideHostValues,
} from "@ai-matrx/chat/mandates/host-values/host-values";
import { HOST_VALUE_SITES, OPEN_SITE_CEILING } from "../sites";
import { notesPileValues } from "@/features/notes/notes-assists-producer";
import { overduePileValues } from "@/features/tasks/tasks-assists-producer";

const ROOT = path.resolve(__dirname, "../../../..");

function channelCallFor(source: string, provision: string): boolean {
  const p = provision.replace(/[.]/g, "\\.");
  return [
    new RegExp(`hostValues:\\s*\\{\\s*provision:\\s*"${p}"`),
    new RegExp(`provideHostValues\\([^;]*?"${p}"`, "s"),
    new RegExp(`useMandateHostValues\\([^,]*,\\s*"${p}"`),
  ].some((re) => re.test(source));
}

describe("host-value sites guard", () => {
  for (const site of HOST_VALUE_SITES.filter((s) => s.status === "wired")) {
    it(`${site.site} sends ${site.provision} through the channel`, () => {
      const source = readFileSync(path.join(ROOT, site.file), "utf8");
      if (site.via === "contextItems") {
        // ProTextareaAgentPanel turns contextItems into `variables` on the mandate door.
        expect(source).toMatch(/contextItems=/);
        expect(source).toMatch(new RegExp(`mandateKey=\\{MANDATE_KEYS\\.${site.mandateKey.replace(/\./g, "__")}\\}`));
        const panel = readFileSync(path.join(ROOT, "components/official/proTextareaAgentActions.ts"), "utf8");
        expect(panel).toMatch(/byMandate\s*\?\s*\{\s*variables:/);
      } else if (site.via === "pageGuidanceRecord") {
        // The record id rides EVERY turn; the server resolves the record by id.
        expect(source).toMatch(/usePageGuidanceRecord\([\s\S]*?\{\s*everyTurn:\s*true\s*\}\s*,?\s*\)/);
      } else {
        expect(channelCallFor(source, site.provision)).toBe(true);
      }
    });
  }

  it("the Studio sends its four values every turn and keeps no hooks of its own", () => {
    const page = readFileSync(path.join(ROOT, "features/agents/studio/components/AgentStudioPage.tsx"), "utf8");
    const run = readFileSync(path.join(ROOT, "features/agents/studio/components/StudioRun.tsx"), "utf8");
    expect(page).toMatch(
      /useMandateHostValues\(\s*ASSISTANT_MANDATE,\s*"agent_studio\.do_the_job_together",[\s\S]*?studio_mode[\s\S]*?studio_phase[\s\S]*?agent_id[\s\S]*?build_id[\s\S]*?\{\s*everyTurn:\s*true,\s*hostSuppliesContext:\s*true\s*\}/,
    );
    expect(page).not.toMatch(/assistantVariables|mandateVariables/);
    expect(run).not.toMatch(/mandateVariables|registerConversationHooks|variablesRef/);
  });

  it("the channel is the package's, not a local copy", () => {
    expect(existsSync(path.join(ROOT, "features/mandates/host-values/host-values.ts"))).toBe(false);
    expect(existsSync(path.join(ROOT, "features/mandates/host-values/useMandateHostValues.ts"))).toBe(false);
  });

  it("the assist launch provides the chip's values and opens the mandate door", () => {
    const source = readFileSync(
      path.join(ROOT, "features/assists/runtime/handlers/launch-agent.ts"),
      "utf8",
    );
    expect(source).toMatch(/provideHostValues\(/);
    expect(source).toMatch(/mandateKey:\s*mandateKey\s*\?\?\s*null/);
  });

  it("the open list only shrinks, and every open site says why", () => {
    const open = HOST_VALUE_SITES.filter((s) => s.status === "open");
    expect(open.length).toBeLessThanOrEqual(OPEN_SITE_CEILING);
    for (const site of open) expect(site.reason?.trim()).toBeTruthy();
  });
});

describe("host-values channel", () => {
  const state = (mandateKey: string | null, roles: string[] = []) => ({
    conversations: { byConversationId: { c1: { mandateKey } } },
    messages: {
      byConversationId: {
        c1: {
          orderedIds: roles.map((_, i) => `m${i}`),
          byId: Object.fromEntries(roles.map((role, i) => [`m${i}`, { role }])),
        },
      },
    },
  });

  it("sends the provider's present values on a mandate-door first turn", () => {
    const release = provideHostValues("tasks.triage", "tasks.overdue_pileup", () => ({
      overdue_count: 2,
      overdue_task_ids: ["a", "b"],
      today: "",
    }));
    expect(hostValuesForTurn(state("tasks.triage", ["user"]), "c1")).toEqual({
      variables: { overdue_count: 2, overdue_task_ids: ["a", "b"] },
    });
    release();
  });

  it("never sends on the agent door, another mandate, or after an answer", () => {
    const release = provideHostValues("tasks.triage", "tasks.overdue_pileup", () => ({
      overdue_count: 2,
    }));
    expect(hostValuesForTurn(state(null), "c1")).toEqual({});
    expect(hostValuesForTurn(state("notes.organizer"), "c1")).toEqual({});
    expect(hostValuesForTurn(state("tasks.triage", ["user", "assistant"]), "c1")).toEqual({});
    release();
    expect(hostValuesForTurn(state("tasks.triage"), "c1")).toEqual({});
  });

  it("a once provider is consumed by the first turn that takes it", () => {
    provideHostValues("notes.organizer", "notes.unorganized_pile", () => ({ unorganized_count: 5 }), {
      once: true,
    });
    expect(hostValuesForTurn(state("notes.organizer"), "c1")).toEqual({
      variables: { unorganized_count: 5 },
    });
    expect(hostValuesForTurn(state("notes.organizer"), "c1")).toEqual({});
  });

  it("drops absent values", () => {
    expect(presentHostValues({ a: null, b: undefined, c: " ", d: [], e: 0, f: false })).toEqual({
      e: 0,
      f: false,
    });
  });

  it("the producers' values match their provisions' kinds", () => {
    expect(notesPileValues([{ id: "n1", label: "Groceries" }])).toEqual({
      unorganized_count: 1,
      unorganized_note_ids: ["n1"],
      unorganized_note_titles: ["Groceries"],
    });
    const values = overduePileValues(
      [
        {
          id: "t1",
          title: "File taxes",
          completed: false,
          status: "todo" as never,
          description: "",
          attachments: [],
          dueDate: "2026-10-01",
          priority: "high",
          projectId: "p1",
          projectName: "Home",
        },
      ],
      new Date("2026-10-18T12:00:00Z"),
    );
    expect(values.overdue_count).toBe(1);
    expect(values.overdue_task_project_names).toEqual(["Home"]);
    expect(values.today).toBe("2026-10-18");
  });
});
