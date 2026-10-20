// features/make/__tests__/install-retry-connects-a-half-made-assistant.test.ts
//
// INSTALL-ORDER (2026-10-20). "Team Wiki & Company Home" failed its first press with 'The template binds "related_tables" to its
// "team" table, which was not created.' and "Try again" then showed the template installed. The assistant had been forked and
// RECORDED on the install before the connect step failed (so Remove can archive it), and the retry read a recorded agent as a
// finished one: the install "worked" with an assistant whose variables were never connected to its tables.
//
// BREAKS THIS CATCHES: a recorded-but-unconnected assistant taken as done · a retry forking a second copy · a retry that does not
// connect the copy it finds · a finished assistant being written to again.

import { addInstalledAgent, type InstallAnswer } from "../gallery/installAgent";
import { createTemplateAgentCopier, templateVariablesAreBound, type TemplateAgentCopyPorts } from "@/features/templates/agentCopy";

jest.mock("@/features/templates/agentCopyHost", () => ({ templateAgentCopier: jest.fn(), templateAgentArchiver: jest.fn() }));

const DEFS = () => [
  { name: "primary_table", customComponent: { type: "table" }, defaultValue: "" },
  { name: "related_tables", customComponent: { type: "tables" }, defaultValue: [] },
];

function world() {
  const store = { variable_definitions: DEFS() as unknown, tools: [] as string[] };
  let forks = 0;
  const ports: TemplateAgentCopyPorts = {
    platformAgentIdByName: async () => "plat-1",
    duplicate: async () => `copy-${++forks}`,
    name: async () => "Wiki assistant",
    write: async (_id, _what, build) => {
      const patch = build({ variable_definitions: store.variable_definitions, tools: store.tools } as never);
      if (patch.variable_definitions !== undefined) store.variable_definitions = patch.variable_definitions;
    },
    archive: async () => undefined,
    recordsToolId: async () => "tool-records",
  };
  return { store, ports, forks: () => forks };
}

const answer = (relatedTableId: string, made: InstallAnswer["made"] = []): InstallAnswer => ({
  install_id: "inst-1",
  state: "installed",
  done: true,
  made: [{ kind: "table", id: "t-wiki", ref: "tables.wiki_page", title: "Wiki pages", table_id: null }, ...(made ?? [])],
  agent: {
    platform_agent: { id: "plat-1", name: "Answers From Your Tables" },
    name: "Wiki assistant",
    copied: (made ?? []).some((m) => m.kind === "agent"),
    bindings: [
      { variable: "primary_table", tableToken: "wiki_page", describes: "pages", table_id: "t-wiki" },
      { variable: "related_tables", tableToken: "team", describes: "teams", table_id: relatedTableId },
    ],
  },
});

describe("a retry connects an assistant an earlier run recorded but never connected", () => {
  it("the first press fails by name, the retry finishes the SAME copy, and a finished copy is left alone", async () => {
    const w = world();
    const copier = createTemplateAgentCopier(w.ports);
    const recorded: InstallAnswer[] = [];
    const note = jest.fn(async (_i: string, id: string, label: string) => {
      const a = answer("t-team", [{ kind: "agent", id, ref: "agent", title: label, table_id: null }]);
      recorded.push(a);
      return a;
    });
    const claim = jest.fn().mockResolvedValue({ state: "claimed", orphans: [] });
    const agentFinished = async (_id: string, bindings: Parameters<typeof templateVariablesAreBound>[1]) => templateVariablesAreBound(w.store.variable_definitions, bindings);

    // First press: the template's second variable has no table (the install never made "team").
    const first = await addInstalledAgent(answer(""), "org-1", { copier, note, claim, agentFinished });
    expect(first.ok).toBe(false);
    expect((first as { why: string }).why).toContain('which was not created');
    expect(w.forks()).toBe(1);
    expect(note).toHaveBeenCalledTimes(1); // the half-made copy is recorded so Remove archives it

    // Retry: the install now answers the copy as recorded. It is NOT done: its variables carry no binding.
    const recordedAnswer = recorded[0]!;
    expect(templateVariablesAreBound(w.store.variable_definitions, [])).toBe(true);
    const retry = await addInstalledAgent(recordedAnswer, "org-1", { copier, note, claim, agentFinished });
    expect(retry.ok).toBe(true);
    expect(w.forks()).toBe(1); // the same copy, never a second fork
    const related = (w.store.variable_definitions as Array<Record<string, unknown>>).find((d) => d.name === "related_tables")!;
    expect(JSON.stringify(related.defaultValue)).toContain("t-team");

    // A third open finds it connected and writes nothing.
    const writes = jest.spyOn(w.ports, "write");
    const again = await addInstalledAgent(recordedAnswer, "org-1", { copier: createTemplateAgentCopier(w.ports), note, claim, agentFinished });
    expect(again.ok).toBe(true);
    expect(writes).not.toHaveBeenCalled();
  });

  it("without the check the retry reports done and the assistant stays unconnected (the defect)", async () => {
    const w = world();
    const copier = createTemplateAgentCopier(w.ports);
    const note = jest.fn(async (_i: string, id: string, label: string) => answer("t-team", [{ kind: "agent", id, ref: "agent", title: label, table_id: null }]));
    const claim = jest.fn().mockResolvedValue({ state: "claimed", orphans: [] });
    await addInstalledAgent(answer(""), "org-1", { copier, note, claim });
    const recordedAnswer = await note("inst-1", "copy-1", "Wiki assistant");
    const retry = await addInstalledAgent(recordedAnswer, "org-1", { copier, note, claim });
    expect(retry.ok).toBe(true);
    const related = (w.store.variable_definitions as Array<Record<string, unknown>>).find((d) => d.name === "related_tables")!;
    expect(related.defaultValue).toEqual([]); // never connected
  });
});
