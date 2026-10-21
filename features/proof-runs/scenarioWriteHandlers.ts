import { collectionWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import {
  parseCreateScenarios,
  parseUpdateScenarios,
  parseDeleteScenarios,
} from "./scenarioAgentWrites";
import type { ProofScenario, ProofMandateOption } from "./types";

/** Both the human editor and these handlers call the page's same save/remove. */
export function createScenarioWriteHandlers(input: {
  current: () => readonly ProofScenario[];
  mandates: () => readonly ProofMandateOption[];
  ensureReady: () => void;
  save: (scenario: ProofScenario) => Promise<ProofScenario>;
  remove: (slug: string) => Promise<void>;
}) {
  const toRef = (scenario: ProofScenario) => ({
    id: scenario.slug,
    slug: scenario.slug,
    name: scenario.label,
  });
  return collectionWriteHandlers(
    {
      plural: "scenarios",
      singular: "scenario",
      create: {
        parse(value: unknown) {
          input.ensureReady();
          return parseCreateScenarios(value, input.current(), input.mandates());
        },
        run: async (scenario: ProofScenario) =>
          toRef(await input.save(scenario)),
        nameOf: (scenario: ProofScenario) => scenario.label,
      },
      update: {
        parse(value: unknown) {
          input.ensureReady();
          return parseUpdateScenarios(value, input.current(), input.mandates());
        },
        run: async (plan: { scenario: ProofScenario; changed: string[] }) =>
          toRef(await input.save(plan.scenario)),
        nameOf: (plan: { scenario: ProofScenario }) => plan.scenario.label,
        changedOf: (plan: { changed: string[] }) => plan.changed,
      },
      delete: {
        parse(value: unknown) {
          input.ensureReady();
          return parseDeleteScenarios(value, input.current());
        },
        run: async (scenario: ProofScenario) => {
          await input.remove(scenario.slug);
          return toRef(scenario);
        },
        nameOf: (scenario: ProofScenario) => scenario.label,
      },
    },
    refuseSurfaceWrite,
  );
}
