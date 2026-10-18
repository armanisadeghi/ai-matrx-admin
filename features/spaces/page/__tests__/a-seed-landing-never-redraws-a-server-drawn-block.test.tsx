/**
 * @jest-environment jsdom
 */
// A SEED LANDING NEVER REDRAWS A SERVER-DRAWN BLOCK (lane SPACES-REDRAW, 2026-10-17).
//
// A Spaces page's database blocks are drawn on the server inside their own Suspense boundaries; the browser
// hydrates each one only once its seed (and its code) is there. React reacts to ANY change of a context above
// a boundary it has not hydrated yet by throwing the server's HTML away and drawing the block again from its
// loading box — the ~2 s redraw on every Spaces page (every database block collapsing and growing back).
// The seed provider used to set its state in an effect right after hydration (a render of everything reading
// the seeds, at the moment the page's blocks were still hydrating) and handed a new context value on every
// seed that landed. The second test is the guard (two renders on mount before, one now); the first hydrates
// real server HTML, holds one block's seed back and lets another land, and checks the served elements stay.

import { act, Suspense } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { ResolvedBlockSeed, SpaceSeedProvider, useAwaitedBlockSeed, useSeededWhere, useSpaceSeedSettled, type BlockSeed, type SpaceBlockSeeds } from "../space-seed-context";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Rows({ tableId }: { tableId: string }) {
  const where = useSeededWhere(tableId);
  return <div data-testid={`rows-${tableId}`}>{where ? "rows" : "no where"}</div>;
}

function Block({ id }: { id: string }) {
  const seed = useAwaitedBlockSeed(id);
  return (
    <ResolvedBlockSeed blockId={id} seed={seed}>
      <Rows tableId={`t-${id}`} />
    </ResolvedBlockSeed>
  );
}

function Page({ seeds }: { seeds: SpaceBlockSeeds }) {
  return (
    <SpaceSeedProvider seeds={seeds}>
      {["b1", "b2"].map((id) => (
        <Suspense key={id} fallback={<div className="loading" />}>
          <Block id={id} />
        </Suspense>
      ))}
    </SpaceSeedProvider>
  );
}

const seedOf = (id: string): BlockSeed => ({ tableId: `t-${id}`, where: { data: {}, error: null }, records: null });

/** A promise React reads synchronously (what a seed is on the server once its read has answered). */
function answered<T>(value: T): Promise<T> {
  return Object.assign(Promise.resolve(value), { status: "fulfilled", value });
}

it("the provider mounting and another block's seed landing leave a still-waiting block's server HTML in place", async () => {
  const html = renderToString(<Page seeds={{ b1: answered(seedOf("b1")), b2: answered(seedOf("b2")) }} />);
  expect(html).toContain("rows");

  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  const served = host.querySelector('[data-testid="rows-t-b1"]');
  expect(served).not.toBeNull();

  // In the browser b1's seed has not arrived yet (its boundary stays dehydrated); b2's arrives a moment later.
  let landB2!: (seed: BlockSeed) => void;
  const b2 = new Promise<BlockSeed | null>((resolve) => (landB2 = resolve));
  const b1 = new Promise<BlockSeed | null>(() => undefined);
  const errors: string[] = [];
  const spy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(" ")));
  let root!: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(host, <Page seeds={{ b1, b2 }} />, { onRecoverableError: (e) => errors.push(String(e)) });
  });
  await act(async () => {
    landB2(seedOf("b2"));
    await b2;
  });

  expect(host.querySelector(".loading")).toBeNull();
  expect(host.querySelector('[data-testid="rows-t-b1"]')).toBe(served);
  expect(host.querySelector('[data-testid="rows-t-b2"]')?.textContent).toBe("rows");
  await act(async () => root.unmount());
  host.remove();
  spy.mockRestore();
  expect(errors).toEqual([]);
});

it("hydrating the page sets no seed state: nothing reading the seeds renders a second time on mount", async () => {
  let renders = 0;
  function Reader() {
    renders += 1;
    return <span>{useSpaceSeedSettled() ? "settled" : "waiting"}</span>;
  }
  const pending = new Promise<BlockSeed | null>(() => undefined);
  const page = (seeds: SpaceBlockSeeds) => (
    <SpaceSeedProvider seeds={seeds}>
      <Reader />
    </SpaceSeedProvider>
  );
  const host = document.createElement("div");
  host.innerHTML = renderToString(page({ b1: pending }));
  renders = 0;
  let root!: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(host, page({ b1: pending }));
  });
  expect(host.textContent).toBe("waiting");
  expect(renders).toBe(1);
  await act(async () => root.unmount());
});
