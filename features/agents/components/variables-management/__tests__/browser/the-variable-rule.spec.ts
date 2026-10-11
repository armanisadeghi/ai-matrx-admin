/**
 * THE VARIABLE RULE, driven through the REAL UI against the REAL server, signed in as admin@admin.com.
 *
 *   only a DECLARED `{{name}}` is filled, once, on the first turn; declared with no value → "";
 *   every other `{{...}}` stays exactly as written and nothing is added; `{{!name}}` in the author's
 *   text becomes `{{name}}`. In the editor `{{!name}}` is plain text — not coloured, not listed as
 *   undeclared (`@ai-matrx/content-ir/source` variable-tokens).
 *
 * The server half (the same cases, byte-exact, through the dry-run and continue doors) is aidream's
 * `tests/test_the_variable_rule_reaches_the_model_live.py`; the owner's worked examples below are the
 * same literals. THIS file is the half only a browser can prove: a person types the prompt, the editor
 * shows what the rule says, and the UI's own run reaches the model and the database byte-exact.
 *
 * THE BREAK EACH ASSERTION NAMES
 *   · the helper counting `{{!slot}}` as a variable → it is coloured and listed under Undeclared;
 *   · the UI sending undeclared names, or the server filling them → `{{my}}` changes in what was stored/sent;
 *   · the escape not unescaping, or unescaping twice → "Use {{slot}} here" is not the paragraph;
 *   · the server adding a notice for an undeclared slot → "[matrx:not-delivered]" / "placeholder_left_out".
 *
 * Run (the preview must be up: `pnpm preview:start`):  pnpm test:variable-rule:browser
 *
 * WHAT IS PAID. One real turn on the catalog's cheapest plumbing model
 * (`aidream/scripts/test_model.py plumbing`; override with MATRX_TEST_MODEL_NAME), a one-word reply.
 * The agent and its chats are ARCHIVED (never deleted) afterwards, and any left by a killed run are
 * archived first.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { fillSecret, until } from "../../../../../../scripts/lib/seat-browser.mjs";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  archive,
  conversationIdsOf,
  credentialsPresent,
  readAgent,
  readStored,
  staleAgentIds,
  storedText,
  wireMessages,
} from "./live-reads";

// --------------------------------------------------------------------------- //
// The owner's worked examples — literals, never computed by the code under test
// --------------------------------------------------------------------------- //
// matrx-real-data:allow the owner's exact example text for THE VARIABLE RULE (2026-10-10)
const AUTHORED = "This is {{my}} little {{fake}} prompt and /{{my}} example";
const FAKE_FILLED = "This is {{my}} little VALUE prompt and /{{my}} example";
const ESCAPE_AUTHORED = "Use {{!slot}} here";
const ESCAPE_RESULT = "Use {{slot}} here";
const VALUE = "VALUE";
const FORBIDDEN = ["[matrx:not-delivered]", "matrx:not-delivered", "NOT DELIVERED", "placeholder_left_out"];

// A real use case: a physical-therapy clinic's pickup-window note for its front desk.
const AGENT_NAME = "Front Desk Pickup Window Note (variable rule check)";
const RUN_MESSAGE = "Reply with the single word OK.";

test.skip(!credentialsPresent(), "UNMEASURED: AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD / Supabase keys are not in .env.local");

function cheapestModelName(): string {
  if (process.env.MATRX_TEST_MODEL_NAME) return process.env.MATRX_TEST_MODEL_NAME;
  const out = execFileSync("uv", ["run", "python", "scripts/test_model.py", "plumbing"], {
    cwd: resolve(__dirname, "../../../../../../../aidream"),
    encoding: "utf8",
    timeout: 180_000,
  });
  const m = out.match(/^plumbing: \S+ \((.+?),/m);
  if (!m) throw new Error(`could not read the plumbing model from: ${out.slice(-300)}`);
  return m[1];
}

/** The shared preview parks an idle or evicted host behind a Resume page; press it as a person does. */
function resumeWhenParked(page: Page): void {
  page.on("framenavigated", async (frame) => {
    if (frame === page.mainFrame() && frame.url().includes("__dev-walk")) {
      await page.getByRole("button", { name: /Resume/ }).first().click().catch(() => undefined);
    }
  });
}

/** The text of the row a label opens ("Undeclared (2) my fake"), read as the person sees it. */
async function rowText(page: Page, label: string): Promise<string> {
  // The shared preview hot-reloads when a peer saves a file: a read that lands mid-reload is "not yet", never a verdict.
  return page.evaluate((l) => {
    const el = Array.from(document.querySelectorAll("span,p,div,label")).find((e) =>
      Array.from(e.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim().startsWith(l)),
    );
    return Array.from(el?.parentElement?.querySelectorAll("button") ?? [])
      .map((c) => (c.textContent ?? "").replace(/\s+/g, " ").trim())
      .join(" ");
  }, label).catch(() => "");
}

/** Every rendered occurrence of a token, with the background of the element that directly holds it. */
async function renderedTokens(page: Page, token: string): Promise<{ text: string; alpha: number; border: string }[]> {
  return page.evaluate((t) => {
    const found: { text: string; alpha: number; border: string }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!(n.textContent ?? "").includes(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest("textarea,script,style")) continue;
      const cs = getComputedStyle(el);
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
      const parts = m ? m[1].split(",").map((x) => parseFloat(x)) : [0, 0, 0, 0];
      found.push({ text: n.textContent ?? "", alpha: parts.length > 3 ? parts[3] : 1, border: cs.borderTopWidth });
    }
    return found;
  }, token).catch(() => []);
}

/**
 * Every button on the page named exactly `name`. The editor draws each `{{name}}` as such a button, and
 * the Undeclared / Variables rows add one more each — callers know how many rows list the name.
 */
async function buttonsNamed(page: Page, name: string): Promise<number> {
  return page.getByRole("button", { name, exact: true }).count();
}

test.describe.serial("THE VARIABLE RULE in the UI", () => {
  let page: Page;
  let agentId = "";
  let conversationId = "";
  const leftovers: string[] = [];

  test.beforeAll(async ({ browser, baseURL }) => {
    const stale = await staleAgentIds(AGENT_NAME);
    await archive(stale, await conversationIdsOf(stale));
    const context = await browser.newContext({ storageState: undefined, viewport: { width: 1600, height: 1000 } });
    page = await context.newPage();
    resumeWhenParked(page);
    // The shared preview is slow under load and parks hosts: sign in as a person does and CHECK who the
    // app says is signed in, again and again, instead of assuming a press took (or did not).
    const whoami = (): Promise<string | null> =>
      page
        .evaluate(async () => {
          try {
            return ((await (await fetch("/api/whoami")).json()) as { email?: string }).email ?? null;
          } catch {
            return null;
          }
        })
        .catch(() => null);
    let signedIn: string | null = null;
    for (let attempt = 1; attempt <= 12 && !signedIn; attempt += 1) {
      await page.goto(`${baseURL}/login`, { waitUntil: "load" }).catch(() => undefined);
      signedIn = await whoami();
      console.log(`[variable-rule] sign-in attempt ${attempt}: ${new URL(page.url()).pathname} signedIn=${signedIn}`);
      if (signedIn) break;
      if (page.url().includes("__dev-walk")) {
        // Parked: another session needed this host's slot. Resume, as a person would, and look again.
        await page.getByRole("button", { name: /Resume/ }).first().click().catch(() => undefined);
        await page.waitForTimeout(8000);
        continue;
      }
      // The form paints late on a cold route (first compile): wait for it here, never re-navigate.
      if (!(await page.locator("#email").waitFor({ timeout: 90_000 }).then(() => true, () => false))) {
        const seen = (await page.innerText("body").catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
        console.log(`[variable-rule] no sign-in form at ${page.url()} — page says: ${seen}`);
        continue;
      }
      await page.waitForTimeout(4000); // the form only accepts input once its bundle attaches
      await page.fill("#email", ADMIN_EMAIL);
      await fillSecret(page, "#password", ADMIN_PASSWORD);
      await page.click('button:has-text("Sign in")');
      signedIn = (await until("admin sign-in", whoami, 90_000)).v;
    }
    expect(signedIn, "the app must say admin@admin.com is signed in").toBe("admin@admin.com");
  });

  test.afterAll(async () => {
    const ids = [agentId, ...leftovers].filter(Boolean);
    if (ids.length > 0) await archive(ids, await conversationIdsOf(ids));
    await page?.context().close();
  });

  test("a person writes the prompt and declares only fake", async () => {
    // 1. Create the agent the way a person does: the manual form, then the builder.
    await page.goto("/agents/new/manual");
    const name = page.locator("#new-agent-name");
    const instructions = page.locator("#new-agent-instructions");
    const authoredSystem = `${AUTHORED}\n\n${ESCAPE_AUTHORED}`;
    await expect(async () => {
      // A fill that lands before hydration is wiped when the bundle attaches: fill until it sticks.
      await name.fill(AGENT_NAME);
      await instructions.fill(authoredSystem);
      await page.waitForTimeout(2500);
      expect(await name.inputValue()).toBe(AGENT_NAME);
      expect(await instructions.inputValue()).toBe(authoredSystem);
    }).toPass({ timeout: 300_000 });
    await page.getByRole("button", { name: "Create agent" }).click();
    // The shared preview can park this host between the press and the redirect (its slot is needed by
    // another session). The row is created on the press, so find it by name and open it as a person would.
    await expect
      .poll(
        async () => {
          if (/\/agents\/[0-9a-f-]{36}\/build/.test(page.url())) return page.url().match(/\/agents\/([0-9a-f-]{36})\//)![1];
          const made = await staleAgentIds(AGENT_NAME);
          return made[0] ?? "";
        },
        { message: "the created agent", timeout: 300_000 },
      )
      .toMatch(/^[0-9a-f-]{36}$/);
    agentId = /\/agents\/[0-9a-f-]{36}\/build/.test(page.url())
      ? page.url().match(/\/agents\/([0-9a-f-]{36})\//)![1]
      : (await staleAgentIds(AGENT_NAME))[0];
    leftovers.push(...(await staleAgentIds(AGENT_NAME)));
    if (!page.url().includes(`/agents/${agentId}/build`)) await page.goto(`/agents/${agentId}/build`);

    // 2. The agent's user message, typed into the builder's own editor.
    await expect(page.getByText(/^Undeclared/).first()).toBeVisible({ timeout: 300_000 });
    await page.waitForTimeout(5000);
    // A reload (a peer's save, a parked host) restores the unsaved draft: type only what is not there.
    if ((await renderedTokens(page, "{{!slot}}")).length < 2) {
      await page.getByRole("button", { name: "User", exact: true }).click();
      // The user-message editor is the builder's second rich editor (the system prompt is the first).
      await page.locator("[contenteditable=true]").nth(1).click();
      await page.keyboard.insertText(AUTHORED);
      await page.keyboard.press("Enter");
      await page.keyboard.insertText(ESCAPE_AUTHORED);
    }

    // 3. Editor, nothing declared yet: {{my}} and {{fake}} are listed undeclared; {{!slot}} is not.
    await expect.poll(() => rowText(page, "Undeclared"), { message: "the Undeclared list" }).toMatch(/\bmy\b/);
    const undeclared = await rowText(page, "Undeclared");
    expect(undeclared, "{{fake}} is undeclared until it is declared").toMatch(/\bfake\b/);
    expect(undeclared, "{{!slot}} is the author's example, never an undeclared variable").not.toMatch(/slot/);
    expect(await page.content(), "no chip may offer to declare `!slot`").not.toMatch(/!slot\s*\+/);

    // {{!slot}} is plain text wherever the builder shows it — and {{my}} IS drawn as a chip, so the
    // check can tell a chip from plain text (a helper that coloured both would fail the first line).
    const slots = await renderedTokens(page, "{{!slot}}");
    expect(slots.length, "the builder shows {{!slot}} in the system prompt and the user message").toBeGreaterThanOrEqual(2);
    for (const s of slots) {
      expect(s.alpha, `{{!slot}} is plain text, not a coloured chip (${JSON.stringify(s)})`).toBe(0);
    }
    // `my` appears once in the Undeclared row and twice as a chip in the system prompt.
    expect(await buttonsNamed(page, "my"), "{{my}} twice in the prompt, once in the Undeclared row").toBe(3);
    expect(await buttonsNamed(page, "slot"), "{{!slot}} never becomes a chip or a list entry").toBe(0);

    // 4. Declare ONLY fake, with the chip's one click.
    await page.locator("button", { hasText: /^fake\s*$/i }).filter({ has: page.locator("svg") }).first().click();
    await expect.poll(() => rowText(page, "Variables"), { message: "the Variables row" }).toMatch(/fake/i);
    const after = await rowText(page, "Undeclared");
    expect(after, "{{my}} stays undeclared").toMatch(/\bmy\b/);
    expect(after, "{{fake}} is declared now").not.toMatch(/\bfake\b/);
    expect(after).not.toMatch(/slot/);
    // `fake` is now a declared variable: one chip in the prompt, none under Undeclared.
    expect(await buttonsNamed(page, "fake"), "{{fake}} is declared: its chip is in the prompt").toBeGreaterThanOrEqual(1);

    // 5. The cheapest plumbing model, chosen as a person chooses it.
    const model = cheapestModelName();
    await expect(async () => {
      if (await page.locator("button[aria-haspopup=dialog]").filter({ hasText: model }).count()) return;
      await page.keyboard.press("Escape");
      await page.locator("button[aria-haspopup=dialog]").filter({ hasText: /Claude|GPT|Gemini|Llama|Grok/ }).first().click();
      await page.getByPlaceholder("Search models…").fill(model);
      await page.getByText(model, { exact: true }).first().click({ timeout: 20_000 });
      await expect(page.locator("button[aria-haspopup=dialog]").filter({ hasText: model }).first()).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 180_000 });

    // 6. Save, then read the row the platform kept.
    await page.getByRole("button", { name: /^Save/i }).first().click();
    await expect
      .poll(async () => (await readAgent(agentId)).variable_definitions?.map((v) => v.name).join(","), {
        message: "the saved agent declares exactly [fake]",
        timeout: 120_000,
      })
      .toBe("fake");
    const saved = await readAgent(agentId);
    const savedText = JSON.stringify(saved.messages);
    expect(savedText, "the system prompt was saved as typed").toContain(AUTHORED);
    expect(savedText, "the escape was saved as the author wrote it").toContain(ESCAPE_AUTHORED);
  });

  test("the UI's run reaches the model with only fake filled, byte-exact", async () => {
    // The run box's own variable field, then one real turn.
    await page.getByRole("button", { name: "Done", exact: true }).click({ timeout: 5000 }).catch(() => undefined);
    await page.getByPlaceholder("Enter value...").first().fill(VALUE);
    const sent = page.waitForRequest(
      (r) => r.method() === "POST" && /\/ai\/(agents\/[0-9a-f-]{36}|manual)/.test(r.url()),
      { timeout: 120_000 },
    );
    await page.getByPlaceholder("Type your message...").first().fill(RUN_MESSAGE);
    // Enter in the run box sends (the left chat has a Send button of its own; this is the agent's box).
    await page.getByPlaceholder("Type your message...").first().press("Enter");
    page.on("request", (r) => r.method() === "POST" && /\/ai\//.test(r.url()) && console.log(`[variable-rule] POST ${new URL(r.url()).pathname}`));
    const request = await sent;
    const body = JSON.parse(request.postData() ?? "{}") as { conversation_id?: string; variables?: Record<string, string> };
    console.log(`[variable-rule] run body keys: ${Object.keys(body).join(",")}; variables=${JSON.stringify(body.variables)}`);
    conversationId = body.conversation_id ?? "";
    expect(conversationId, "the run names its conversation").toMatch(/^[0-9a-f-]{36}$/);
    expect(body.variables, "only the declared variable travels, with the value the person typed").toEqual({ fake: VALUE });

    // What the platform STORED and SENT.
    const stored = await readStored(conversationId, 1);
    const paragraphs = stored.systemInstruction.split("\n\n");
    expect(paragraphs, "stored system instruction: the authored paragraph, filled once").toContain(FAKE_FILLED);
    expect(stored.systemInstruction.split(FAKE_FILLED).length - 1).toBe(1);
    expect(paragraphs, "stored system instruction: the escape became a literal").toContain(ESCAPE_RESULT);
    expect(stored.systemInstruction, "an undeclared {{my}} is left exactly as written").not.toContain("{{!");

    // The builder's run sends the agent's own user message (filled once) and then the person's line.
    const userTexts = stored.messages.filter((m) => m.role === "user").map((m) => storedText(m.content).join(""));
    expect(userTexts, "the person's own line is stored as typed").toContain(RUN_MESSAGE);

    const wire = wireMessages(stored.snapshots[0]);
    expect(wire[0][0]).toBe("system");
    expect(wire[0][1].split("\n\n"), "provider system message").toContain(FAKE_FILLED);
    expect(wire[0][1].split("\n\n")).toContain(ESCAPE_RESULT);
    // The agent's own user message is a conversation example in the builder: it reaches the provider,
    // filled once, whatever role the server gives it.
    expect(wire.map(([, t]) => t), "provider messages").toContain(`${FAKE_FILLED}\n\n${ESCAPE_RESULT}`);

    const everything = JSON.stringify([stored, await page.locator("body").innerText()]);
    for (const bad of FORBIDDEN) {
      expect(everything, `rule 4: nothing is added — ${bad}`).not.toContain(bad);
    }
  });
});
