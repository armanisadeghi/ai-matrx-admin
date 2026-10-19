/**
 * Agents opened on the Vault get its non-secret shape again (2026-10-19 restore): the web host
 * fills the `matrx-user/vault` values (count, names, providers) from what the workspace reports,
 * and the right-click menu reads the clicked row — never a value, a note or a custom value.
 */
/** @jest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { VaultDefinition, VaultItem } from "@ai-matrx/vault";
import { useVaultInventory } from "../components/VaultContextMenu";

const item = {
  id: "i1",
  name: "ZZ restore login",
  description: "a description with hunter2",
  definitionKey: "github_token",
  definitionLabel: "GitHub token",
  owner: { kind: "me", label: "Personal", organizationId: null },
  tags: [],
  loginUrls: ["https://github.com/login"],
  notes: "hunter2",
  fields: [],
  custom: [{ key: "pin", label: "PIN", value: "4242" }],
  authenticator: null,
} as unknown as VaultItem;
const definitions = [{ key: "github_token", providerKey: "github" }] as unknown as VaultDefinition[];

describe("the vault's agent context", () => {
  it("is empty until the workspace reports, then carries count, names and providers", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const result: { current: ReturnType<typeof useVaultInventory> } = { current: null as never };
    function Probe() {
      result.current = useVaultInventory();
      return null;
    }
    act(() => createRoot(document.createElement("div")).render(<Probe />));
    expect(result.current.getSurfaceScope()).toMatchObject({ credential_count: 0, credential_labels: [], credential_providers: [] });
    act(() => result.current.onInventory({ items: [item], definitions }));
    const scope = result.current.getSurfaceScope();
    expect(scope).toMatchObject({ credential_count: 1, credential_labels: ["ZZ restore login"], credential_providers: ["github"], selection: "" });
    expect(JSON.stringify(scope)).not.toMatch(/hunter2|4242/);
  });
});
