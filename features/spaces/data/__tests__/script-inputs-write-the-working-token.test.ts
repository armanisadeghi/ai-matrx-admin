// AT-FIX-F: a script input typed as {{record.<x>}} or {{trigger.record.<x>}} is not resolved by the run (the script saw the literal
// text). The panel writes the working form {{<x>}}. Break it catches: the typed form reaching the saved automation untouched.
import { scriptInputs } from "../Automations";

describe("script inputs", () => {
  it("rewrites the unresolved record forms to the property token", () => {
    expect(scriptInputs("rent = {{record.082b4cc2}}\nqty = {{ trigger.record.Qty }}\nok = {{Rent}}\nbody = {{trigger.body.total}}")).toEqual({
      rent: "{{082b4cc2}}",
      qty: "{{Qty}}",
      ok: "{{Rent}}",
      body: "{{trigger.body.total}}",
    });
  });
});
