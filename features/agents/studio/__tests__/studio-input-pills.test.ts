jest.mock("@ai-matrx/rich-content/display/chat-markdown/matrx-variables/MatrxVariableInline", () => ({ MatrxVariableInline: () => null }));
jest.mock("@ai-matrx/rich-content/display/chat-markdown/matrx-variables/VariableDefinitions", () => ({ VariableDefinitionsProvider: () => null }));

import { declaredInputs } from "../components/StudioInputPills";

describe("declaredInputs", () => {
  it("hands the Peek the pretty name, input type, help and options, and nothing invented", () => {
    expect(
      declaredInputs([
        { name: "store_location", label: "Store location", helpText: "Which store", required: true, customComponent: { type: "select", options: ["Pendleton", "Bend"] } },
        { name: "appointment_date", defaultValue: "" },
      ]),
    ).toEqual([
      { name: "store_location", label: "Store location", helpText: "Which store", required: true, type: "select", options: ["Pendleton", "Bend"] },
      { name: "appointment_date", defaultValue: "" },
    ]);
  });
});
