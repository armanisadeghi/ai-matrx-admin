import { createScenarioWriteHandlers } from "../scenarioWriteHandlers";
import { emptyScenario, type ProofMandateOption } from "../types";
const mandate: ProofMandateOption = {
  mandate_key: "test.job",
  label: "Test",
  description: "",
  output_kind: null,
  required_output_keys: [],
  accepts_user_input: true,
  provision: null,
  offered_values: [],
};
it("validates the whole batch before saving then returns both canonical saved identities", async () => {
  const save = jest.fn(async (scenario: ReturnType<typeof emptyScenario>) => ({
    ...scenario,
    check_slug: `scenario:${scenario.slug}`,
  }));
  const remove = jest.fn(async () => {});
  const handlers = createScenarioWriteHandlers({
    current: () => [],
    mandates: () => [mandate],
    ensureReady: () => {},
    save,
    remove,
  });
  const proposed = [
    { slug: "first_case", label: "First", mandate_key: mandate.mandate_key },
    { slug: "second_case", label: "Second", mandate_key: mandate.mandate_key },
  ];
  await handlers.create_scenarios.validate?.(proposed);
  expect(save).not.toHaveBeenCalled();
  const result = await handlers.create_scenarios.apply(proposed);
  expect(save).toHaveBeenCalledTimes(2);
  expect(result).toMatchObject({
    data: { scenarios: [{ id: "first_case" }, { id: "second_case" }] },
  });
});
it("a malformed second record never calls the save function", async () => {
  const save = jest.fn();
  const handlers = createScenarioWriteHandlers({
    current: () => [],
    mandates: () => [mandate],
    ensureReady: () => {},
    save,
    remove: jest.fn(),
  });
  await expect(
    Promise.resolve().then(() =>
      handlers.create_scenarios.validate?.([
        {
          slug: "first_case",
          label: "First",
          mandate_key: mandate.mandate_key,
        },
        { slug: "bad!", label: "Bad", mandate_key: mandate.mandate_key },
      ]),
    ),
  ).rejects.toThrow(/Nothing was changed/);
  expect(save).not.toHaveBeenCalled();
});
it("soft deletion uses the canonical remove and returns retained record identity", async () => {
  const scenario = {
    ...emptyScenario(),
    slug: "old_case",
    label: "Old",
    mandate_key: mandate.mandate_key,
  };
  const remove = jest.fn(async () => {});
  const handlers = createScenarioWriteHandlers({
    current: () => [scenario],
    mandates: () => [mandate],
    ensureReady: () => {},
    save: jest.fn(),
    remove,
  });
  await handlers.delete_scenarios.apply([scenario.slug]);
  expect(remove).toHaveBeenCalledWith(scenario.slug);
});
it("a partial failure names landed records and never attempts later ones", async () => {
  const save = jest.fn(async (scenario: ReturnType<typeof emptyScenario>) => {
    if (scenario.slug === "second_case") throw new Error("API unavailable");
    return scenario;
  });
  const handlers = createScenarioWriteHandlers({
    current: () => [],
    mandates: () => [mandate],
    ensureReady: () => {},
    save,
    remove: jest.fn(),
  });
  await expect(
    Promise.resolve().then(() =>
      handlers.create_scenarios.apply(
        ["first_case", "second_case", "third_case"].map((slug) => ({
          slug,
          label: slug,
          mandate_key: mandate.mandate_key,
        })),
      ),
    ),
  ).rejects.toThrow(/Created 1 of 3/);
  expect(save).toHaveBeenCalledTimes(2);
});
