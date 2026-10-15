/** Insert → Special characters: the searchable set (symbols, arrows, math, currency, Greek, emoji). */

export interface SpecialChar {
  char: string;
  name: string;
}

const s = (chars: string, names: string[]): SpecialChar[] => Array.from(chars).map((char, i) => ({ char, name: names[i] ?? "" }));

export const SPECIAL_CHAR_GROUPS: Array<{ id: string; label: string; chars: SpecialChar[] }> = [
  { id: "symbols", label: "Symbols", chars: s("©®™°§¶†‡•…‰№♠♣♥♦★☆✓✗☎✉", ["copyright", "registered", "trademark", "degree", "section", "pilcrow", "dagger", "double dagger", "bullet", "ellipsis", "per mille", "numero", "spade", "club", "heart", "diamond", "star filled", "star", "check", "cross", "phone", "mail"]) },
  { id: "arrows", label: "Arrows", chars: s("←↑→↓↔↕⇐⇑⇒⇓⇔↩↪➜➤", ["left arrow", "up arrow", "right arrow", "down arrow", "left right arrow", "up down arrow", "left double arrow", "up double arrow", "right double arrow", "down double arrow", "equivalent", "return", "redo", "heavy arrow", "arrowhead"]) },
  { id: "math", label: "Math", chars: s("±×÷≈≠≤≥∞√∑∏∫∂∆∇∈∉∪∩⊂⊃¼½¾²³", ["plus minus", "times", "divide", "approximately", "not equal", "less or equal", "greater or equal", "infinity", "square root", "sum", "product", "integral", "partial", "delta", "nabla", "element of", "not element", "union", "intersection", "subset", "superset", "quarter", "half", "three quarters", "squared", "cubed"]) },
  { id: "currency", label: "Currency", chars: s("$€£¥¢₹₩₽₺₿฿₫", ["dollar", "euro", "pound", "yen", "cent", "rupee", "won", "ruble", "lira", "bitcoin", "baht", "dong"]) },
  { id: "greek", label: "Greek", chars: s("αβγδεζηθικλμνξοπρστυφχψωΩΣΔΠΦΨΛΘ", ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega", "omega capital", "sigma capital", "delta capital", "pi capital", "phi capital", "psi capital", "lambda capital", "theta capital"]) },
  { id: "emoji", label: "Emoji", chars: s("😀😂😊😍😎🤔👍👏🙏🔥✨🎉🚀💡📌📈✅❌🌟💬", ["grinning", "laughing", "smile", "heart eyes", "cool", "thinking", "thumbs up", "clap", "pray", "fire", "sparkles", "party", "rocket", "idea bulb", "pin", "chart up", "check mark", "cross mark", "glowing star", "speech bubble"]) },
];

export function searchSpecialChars(query: string): SpecialChar[] {
  const q = query.trim().toLowerCase();
  const all = SPECIAL_CHAR_GROUPS.flatMap((g) => g.chars);
  if (!q) return all;
  return all.filter((c) => c.char === q || c.name.includes(q));
}
