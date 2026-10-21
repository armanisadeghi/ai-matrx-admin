/**
 * A human name for a brand color ("Deep navy", "Coral"): the nearest entry in a small built-in list,
 * measured in CIELAB so "near" means near to the eye. Pure; tested.
 */

const NAMED: ReadonlyArray<readonly [string, string]> = [
  ["Black", "#000000"], ["Charcoal", "#36454f"], ["Graphite", "#474a51"], ["Slate", "#708090"],
  ["Gray", "#808080"], ["Silver", "#c0c0c0"], ["Light gray", "#d3d3d3"], ["Off-white", "#f5f5f0"],
  ["White", "#ffffff"], ["Ivory", "#fffff0"], ["Cream", "#fffdd0"], ["Beige", "#e8dcc4"],
  ["Sand", "#c2b280"], ["Tan", "#d2b48c"], ["Khaki", "#c3b091"], ["Brown", "#7b4a2a"],
  ["Chocolate", "#4b2e1e"], ["Maroon", "#800000"], ["Burgundy", "#800020"], ["Crimson", "#dc143c"],
  ["Red", "#e32626"], ["Tomato", "#ff6347"], ["Coral", "#ff7f50"], ["Salmon", "#fa8072"],
  ["Orange", "#ff8c00"], ["Amber", "#ffbf00"], ["Gold", "#d4a017"], ["Mustard", "#e1ad01"],
  ["Yellow", "#ffe135"], ["Lemon", "#fff44f"], ["Olive", "#808000"], ["Lime", "#9acd32"],
  ["Chartreuse", "#7fff00"], ["Green", "#228b22"], ["Emerald", "#50c878"], ["Forest green", "#014421"],
  ["Mint", "#98ff98"], ["Sage", "#9caf88"], ["Teal", "#008080"], ["Turquoise", "#40e0d0"],
  ["Aqua", "#00ffff"], ["Sky blue", "#87ceeb"], ["Light blue", "#add8e6"], ["Azure", "#007fff"],
  ["Blue", "#1f51ff"], ["Royal blue", "#4169e1"], ["Cobalt", "#0047ab"], ["Navy", "#000080"],
  ["Deep navy", "#0b1a3a"], ["Ink", "#141a2b"], ["Ocean blue", "#00477f"], ["Sapphire", "#0f52ba"],
  ["Steel blue", "#4682b4"], ["Denim", "#1560bd"], ["Dusty blue", "#8fa9c9"], ["Mist", "#cfd8dc"], ["Midnight", "#191970"], ["Indigo", "#4b0082"], ["Violet", "#7f00ff"],
  ["Purple", "#800080"], ["Lavender", "#b57edc"], ["Lilac", "#c8a2c8"], ["Plum", "#8e4585"],
  ["Magenta", "#ff00ff"], ["Fuchsia", "#c154c1"], ["Hot pink", "#ff69b4"], ["Pink", "#ffc0cb"],
  ["Blush", "#de5d83"], ["Rose", "#ff007f"], ["Peach", "#ffcba4"],
];

/** `#rgb`, `#rrggbb` or `#rrggbbaa` (alpha ignored) to [r, g, b]; null when it is not a hex color. */
export function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null;
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function toLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const NAMED_LAB = NAMED.map(([name, hex]) => [name, toLab(parseHex(hex) as [number, number, number])] as const);

/** The nearest human color name, or null when the value is not a hex color. */
export function colorName(value: string): string | null {
  const rgb = parseHex(value);
  if (!rgb) return null;
  const [l, a, b] = toLab(rgb);
  let best = NAMED_LAB[0];
  let bestDistance = Infinity;
  for (const entry of NAMED_LAB) {
    const [L, A, B] = entry[1];
    const distance = (l - L) ** 2 + (a - A) ** 2 + (b - B) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }
  return best[0];
}

/**
 * Names for a whole palette: each color gets its nearest name that no earlier color took, so two
 * close blues read "Deep navy" and "Ink", never the same name twice. Order is kept.
 */
export function colorNames(values: readonly string[]): Array<string | null> {
  const used = new Set<string>();
  return values.map((value) => {
    const rgb = parseHex(value);
    if (!rgb) return null;
    const [l, a, b] = toLab(rgb);
    const ranked = [...NAMED_LAB].sort(
      (x, y) =>
        (l - x[1][0]) ** 2 + (a - x[1][1]) ** 2 + (b - x[1][2]) ** 2 -
        ((l - y[1][0]) ** 2 + (a - y[1][1]) ** 2 + (b - y[1][2]) ** 2),
    );
    const pick = ranked.find((entry) => !used.has(entry[0])) ?? ranked[0];
    used.add(pick[0]);
    return pick[0];
  });
}

/** True when dark text reads better than white on this color (relative luminance). */
export function prefersDarkText(value: string): boolean {
  const rgb = parseHex(value);
  if (!rgb) return true;
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  return luminance > 0.4;
}
