/** @jest-environment jsdom */
/**
 * Live review 2026-10-21 (sign-up welcome e2e): the "couldn't find you" door showed two Skip buttons, its "Search
 * again" was a dead grey control while the field was empty, and Settings > Privacy carried in-app prose.
 */
import fs from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NarrowField } from "../PersonPickCards";

jest.mock("@/features/marketing/social/components/PlatformMark", () => ({ PlatformMark: () => null }));
jest.mock("@/features/marketing/social/components/SocialImage", () => ({ SocialImage: () => null }));
jest.mock("@/features/marketing/social/server", () => ({ profileAvatarDoor: () => null }));
jest.mock("@/lib/media/external-image", () => ({ browserImageUrl: (u: string) => u }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const here = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

describe("the welcome door's controls", () => {
  it("Search again is never disabled; pressed empty it focuses the field, typed it searches", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onNarrow = jest.fn();
    act(() => createRoot(host).render(<NarrowField onNarrow={onNarrow} />));
    const button = host.querySelector<HTMLButtonElement>('[data-testid="welcome-narrow-submit"]')!;
    const field = host.querySelector<HTMLInputElement>('[data-testid="welcome-narrow-field"]')!;
    expect(button.disabled).toBe(false);
    field.blur();
    act(() => button.click());
    expect(onNarrow).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field);
  });

  it("one Skip: the door's own is a wrapper the CSS hides when a frame carries its Skip", () => {
    const door = here("WelcomeDoor.tsx");
    const css = here("welcome.module.css");
    // The control's display is locked by the design system, so a class on the Button itself can never hide it.
    expect(door).not.toMatch(/\[\[data-welcome-door\]:has/);
    expect(door).toMatch(/<div className=\{`\$\{styles\.doorSkip\}[^>]*>\s*<Button[^\n]*data-testid="welcome-door-skip"/);
    expect(css).toMatch(/\.door:has\(\[data-testid="welcome-skip"\]\)\s*>\s*\.doorSkip\s*\{\s*display:\s*none;/);
  });

  it("Settings > Privacy carries no prose callout", () => {
    const tab = fs.readFileSync(path.join(__dirname, "../../../../settings/tabs/PrivacyTab.tsx"), "utf8");
    expect(tab).not.toMatch(/aren't implemented yet/);
    expect(tab).not.toMatch(/<SettingsCallout/);
  });
});
