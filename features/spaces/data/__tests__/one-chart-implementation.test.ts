// ONE CHART IMPLEMENTATION (2026-10-17). Spaces drew its own donut beside records-ui's ChartBlock, so every
// chart fix had to land twice (the donut legend did). The donut moved into records-ui (centerTotal,
// groupColors, legend) and Spaces now asks records-ui to draw every chart. This guard fails the moment a
// Spaces file draws a chart again: a chart library import, or an SVG ring/arc drawn by hand.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = [join(__dirname, "../.."), join(__dirname, "../../../../app/(core)/spaces")];

const CHART_LIBRARY = /from\s+["'](recharts|d3(-[a-z-]+)?|@visx\/[^"']+|chart\.js|react-chartjs-2|echarts(-for-react)?|@nivo\/[^"']+|victory)["']/;
// A hand-drawn ring or slice: a dashed circle (the old donut's trick) or an SVG arc command in a path.
const HAND_DRAWN = /<circle[^>]*strokeDasharray|strokeDasharray[^>]*<\/circle>|d=\{?[`"'][^`"']*\bA\s*-?\d/;

export function chartFindings(source: string): string[] {
  const out: string[] = [];
  if (CHART_LIBRARY.test(source)) out.push("imports a chart library — draw it with records-ui ChartBlock");
  if (HAND_DRAWN.test(source)) out.push("draws a ring or arc by hand — draw it with records-ui ChartBlock");
  return out;
}

function sources(dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names.flatMap((name) => {
    const path = join(dir, name);
    if (name === "__tests__" || name === "node_modules") return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx?|jsx?)$/.test(name) ? [path] : [];
  });
}

describe("one chart implementation", () => {
  it("catches a hand-drawn donut and a chart library (proves the guard can fail)", () => {
    const oldDonut = `<svg viewBox="0 0 80 80"><circle cx={40} cy={40} r={30} strokeDasharray={\`\${len} \${rest}\`} /></svg>`;
    expect(chartFindings(oldDonut)).toHaveLength(1);
    expect(chartFindings(`import { PieChart } from "recharts";`)).toHaveLength(1);
    expect(chartFindings(`<path d="M 10 10 A 30 30 0 0 1 40 40" />`)).toHaveLength(1);
    expect(chartFindings(`import { ChartBlock } from "@ai-matrx/records-ui";`)).toEqual([]);
  });

  it("no Spaces file draws its own chart", () => {
    const hits = ROOTS.flatMap(sources).flatMap((file) =>
      chartFindings(readFileSync(file, "utf8")).map((why) => `${relative(process.cwd(), file)}: ${why}`),
    );
    expect(hits).toEqual([]);
  });
});
