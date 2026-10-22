/**
 * AN OPENED WINDOW OWNS ITS CALLBACK GROUP — NEVER THE COMPONENT THAT OPENED IT (2026-10-21).
 *
 * Break it names: Find & Replace from a right-click read "No results" over a composer with three
 * matches. The menu body that called the opener unmounts the moment the menu closes, and the opener
 * disposed every callback group it had handed to a window when ITS component unmounted — so the
 * window (still open) lost its live target and handlers. Any opener can be called from a transient
 * surface (a menu, a sheet, a popover), so the class is: an opener hook that drops, on its own
 * unmount, a group it gave to a window it opened.
 *
 * Generic: every `*.overlay.tsx` opener hook (`useOpen…`) is read; one whose effect cleanup
 * disposes groups goes red. The window releases its group when it closes (the opener's `close()`
 * handle, the window body's own close, or the slot being opened again).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(__dirname, "..", "definitions");

/** Each exported `useOpen…` hook's source, up to the next top-level export. */
function openerHooks(src: string): Array<{ name: string; body: string }> {
  const out: Array<{ name: string; body: string }> = [];
  const re = /^export function (useOpen\w*)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const rest = src.slice(m.index + m[0].length);
    const end = rest.search(/^export /m);
    out.push({ name: m[1], body: end === -1 ? rest : rest.slice(0, end) });
  }
  return out;
}

/** An effect whose cleanup disposes something: the opener dropping groups on its own unmount. */
function disposesOnUnmount(body: string): boolean {
  const effects = body.split(/useEffect\s*\(/).slice(1);
  return effects.some((effect) => {
    const cleanup = effect.match(/return\s*\(\)\s*=>\s*(\{[\s\S]*?\n\s*\}|[^\n;]+)/);
    return cleanup !== null && /\bdispose\s*\(\s*\)/.test(cleanup[1]);
  });
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".overlay.tsx"));

describe("an opened window owns its callback group", () => {
  it("finds the openers it polices", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("no opener hook disposes the groups it handed to windows when it unmounts", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const hook of openerHooks(readFileSync(join(DIR, file), "utf8"))) {
        if (disposesOnUnmount(hook.body)) offenders.push(`${file} ${hook.name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the detector sees the shape that broke Find & Replace", () => {
    const broken = `export function useOpenX() {
  const handlesRef = useRef(new Set());
  useEffect(() => {
    const handles = handlesRef.current;
    return () => {
      for (const h of handles) h.dispose();
      handles.clear();
    };
  }, []);
  return useCallback(() => {}, []);
}
`;
    expect(disposesOnUnmount(openerHooks(broken)[0].body)).toBe(true);
  });
});
