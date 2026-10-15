// scripts/lib/flash-test-setup.mjs — every walk that sends a real AI message runs on Gemini 3.8 Flash.
// Arman, 2026-10-15: no test-account exemption from the over-$1 run-approval hold; "a normal agent set up
// using Gemini flash 3.8 costs a few cents to run". Canonical way: the composer's own agent menu —
// "Agent: …" then "Model: …" (the per-run model override, same control a person uses). Never GPT 5.4,
// never General Chat's default model (Sonnet 5.5). Skill: test-model-selection.
//
//   import { setupFlashRun } from "./lib/flash-test-setup.mjs";
//   if (!(await setupFlashRun(page, "Content Writing Partner"))) process.exit(2);   // before sending
export const TEST_MODEL_LABEL = "Gemini 3.8 Flash";

const trigger = (page) => page.locator("button", { hasText: " · " }).filter({ hasText: /Claude|GPT|Gemini|Mock|DeepSeek|Llama|Qwen|Grok/ }).last();

/** Pick the agent (optional) and the Gemini 3.8 Flash model in the composer menu. Returns true only
 *  when the composer's header reads the Flash model, so a walk never sends on anything else. */
export async function setupFlashRun(page, agentName) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (agentName) {
        await trigger(page).click({ timeout: 8000 });
        await page.waitForTimeout(800);
        await page.getByText(agentName).last().click({ timeout: 8000 });
        await page.waitForTimeout(2500);
      }
      await trigger(page).click({ timeout: 8000 });
      await page.waitForTimeout(800);
      await page.getByText(/^Model: /).first().click({ timeout: 8000 });
      await page.waitForTimeout(1000);
      await page.getByPlaceholder(/Search models/).fill(TEST_MODEL_LABEL, { timeout: 8000 });
      await page.waitForTimeout(800);
      await page.getByText(TEST_MODEL_LABEL, { exact: true }).first().click({ timeout: 8000 });
      await page.waitForTimeout(1500);
      const t = await trigger(page).innerText();
      if (new RegExp(TEST_MODEL_LABEL).test(t) && (!agentName || t.startsWith(agentName))) return true;
      console.log(`flash setup attempt ${attempt + 1}: header reads "${t}"`);
    } catch (e) {
      console.log(`flash setup attempt ${attempt + 1} failed: ${String(e.message).split("\n")[0]}`);
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  console.log(`ABORT: could not put the composer on ${TEST_MODEL_LABEL} (never send on another model)`);
  return false;
}
