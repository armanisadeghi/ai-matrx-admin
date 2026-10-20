/**
 * THE ASSISTS CONTROL NEVER COVERS A CHAT MESSAGE (live 2026-10-19).
 *
 * Above the composer the pill found only the person's message bubble — text, not a control — so
 * it rested over it ("4 assists" over the user bubble, adversarial review row 28). A chat message
 * (`data-message-id`) is now a row of the transcript: never a free spot. With the transcript
 * filling everything above the composer, no lift clears it, so the pill takes the chrome slot
 * (no layout shift) instead of covering what the person reads.
 *
 * RED on the old code: the message is a plain div with no control, so a 152 px lift above the
 * composer was written and the pill sat on the bubble.
 */
import { applyAssistDockLift, dockPlacementVar } from "../assistClearance";

function rect(top: number, bottom: number, left: number, right: number): DOMRect {
  return { top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

describe("the assists control never covers a chat message", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not rest over a message bubble above the composer", () => {
    const dock = document.createElement("div");
    dock.setAttribute("data-assists-dock", "");
    dock.getBoundingClientRect = () => rect(820, 850, 1120, 1268);
    document.body.appendChild(dock);

    const composer = document.createElement("div");
    composer.setAttribute("data-agent-input-shell", "");
    composer.getBoundingClientRect = () => rect(700, 880, 760, 1240);
    document.body.appendChild(composer);

    // The transcript: one message per 120 px band, from the header down to the composer.
    const transcript = document.createElement("div");
    transcript.getBoundingClientRect = () => rect(64, 700, 300, 1268);
    document.body.appendChild(transcript);
    const messages: HTMLElement[] = [];
    for (let top = 64; top < 700; top += 120) {
      const message = document.createElement("div");
      message.setAttribute("data-message-id", `m-${top}`);
      const bottom = Math.min(top + 120, 700);
      message.getBoundingClientRect = () => rect(top, bottom, 300, 1268);
      const text = document.createElement("p");
      message.appendChild(text);
      transcript.appendChild(message);
      messages.push(text);
    }
    (document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint = (x, y) => {
      if (y >= 700 && y <= 880 && x >= 760 && x <= 1240) return [dock, composer];
      if (y >= 64 && y < 700 && x >= 300) {
        const text = messages[Math.floor((y - 64) / 120)]!;
        return [dock, text, text.parentElement!, transcript];
      }
      return [dock, document.body];
    };

    applyAssistDockLift();
    // Never a lift that lands on the transcript.
    expect(dockPlacementVar("--assist-dock-lift")).not.toBe("152px");
    const lift = parseInt(dockPlacementVar("--assist-dock-lift") || "0", 10);
    expect(850 - lift > 700 || 820 - lift < 64).toBe(true);
  });
});
