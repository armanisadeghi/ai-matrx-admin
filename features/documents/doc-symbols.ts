/** Insert, Emoji and Special characters: searchable sets, a name per entry. */

export interface Glyph {
  char: string;
  name: string;
}

const e = (rows: string): Glyph[] =>
  rows.split("|").map((r) => r.trim()).filter(Boolean).map((r) => {
    const [char, ...name] = r.split(" ");
    return { char: char!, name: name.join(" ") };
  });

export const EMOJI_GROUPS: Array<{ id: string; label: string; items: Glyph[] }> = [
  { id: "faces", label: "Faces", items: e("😀 grinning|😃 smile|😄 happy|😁 beaming|😆 laughing|😅 sweat smile|😂 tears of joy|🤣 rolling|🙂 slight smile|🙃 upside down|😉 wink|😊 blush|😇 angel|🥰 love|😍 heart eyes|🤩 star struck|😘 kiss|😋 yum|😎 cool|🤓 nerd|🤔 thinking|🤨 skeptical|😐 neutral|🙄 eye roll|😬 grimace|😴 sleeping|😢 cry|😭 sobbing|😤 huff|😡 angry|🤯 mind blown|😱 scream|🥳 party|🤗 hug|🫡 salute|😮 surprised|😳 flushed|🥺 pleading|😷 mask|🤒 sick") },
  { id: "people", label: "Gestures", items: e("👍 thumbs up|👎 thumbs down|👏 clap|🙌 raised hands|🙏 pray thanks|🤝 handshake|💪 strong flex|👌 ok|✌ victory peace|🤞 fingers crossed|👋 wave|✋ raised hand|👆 point up|👉 point right|👈 point left|👇 point down|✍ writing|🤷 shrug|🙋 raise hand|👀 eyes|🧠 brain|❤ heart|💔 broken heart|💯 hundred") },
  { id: "objects", label: "Objects", items: e("💡 idea light bulb|📌 pin|📎 paperclip|📝 memo note|📅 calendar|📈 chart up|📉 chart down|📊 bar chart|📁 folder|📄 page|📧 email|📞 phone|💻 laptop|📱 mobile|🔒 lock|🔑 key|🔍 search|🔔 bell|⏰ alarm clock|⌛ hourglass|🎯 target|🏆 trophy|🎁 gift|📦 package|🛠 tools|⚙ gear|💰 money bag|💵 dollar|🧾 receipt|📚 books") },
  { id: "symbols", label: "Marks", items: e("✅ check mark|❌ cross|⭐ star|🌟 glowing star|✨ sparkles|🔥 fire|⚡ lightning|🚀 rocket|🎉 party popper|🎊 confetti|⚠ warning|❓ question|❗ exclamation|➕ plus|➖ minus|🔴 red circle|🟠 orange circle|🟡 yellow circle|🟢 green circle|🔵 blue circle|🟣 purple circle|⬆ up|⬇ down|➡ right|⬅ left|🔁 repeat|✔ heavy check") },
  { id: "nature", label: "Nature and food", items: e("🌞 sun|🌙 moon|☁ cloud|🌧 rain|❄ snowflake|🌈 rainbow|🌱 seedling|🌳 tree|🌸 blossom|🌍 earth|🐶 dog|🐱 cat|🦊 fox|🐝 bee|🦋 butterfly|🍎 apple|🍕 pizza|🍔 burger|☕ coffee|🍺 beer|🍷 wine|🎂 cake|🍪 cookie|🥑 avocado") },
];

const s = (chars: string, names: string[]): Glyph[] => Array.from(chars).map((char, i) => ({ char, name: names[i] ?? char }));

export const SPECIAL_GROUPS: Array<{ id: string; label: string; items: Glyph[] }> = [
  { id: "punctuation", label: "Punctuation", items: s("©®™°§¶†‡•…‰№‘’“”«»–—¡¿·", ["copyright", "registered", "trademark", "degree", "section", "pilcrow", "dagger", "double dagger", "bullet", "ellipsis", "per mille", "numero", "left single quote", "right single quote", "left double quote", "right double quote", "left guillemet", "right guillemet", "en dash", "em dash", "inverted exclamation", "inverted question", "middle dot"]) },
  { id: "arrows", label: "Arrows", items: s("←↑→↓↔↕⇐⇑⇒⇓⇔↩↪➜➤↖↗↘↙↺↻", ["left arrow", "up arrow", "right arrow", "down arrow", "left right arrow", "up down arrow", "left double arrow", "up double arrow", "right double arrow", "down double arrow", "left right double arrow", "return arrow", "hook arrow", "heavy arrow", "arrowhead", "north west arrow", "north east arrow", "south east arrow", "south west arrow", "anticlockwise arrow", "clockwise arrow"]) },
  { id: "math", label: "Math", items: s("±×÷≈≠≤≥∞√∑∏∫∂∆∇∈∉∪∩⊂⊃∧∨¬∀∃∅∝∠¼½¾⅓⅔²³", ["plus minus", "times", "divide", "approximately", "not equal", "less or equal", "greater or equal", "infinity", "square root", "sum", "product", "integral", "partial", "increment", "nabla", "element of", "not element", "union", "intersection", "subset", "superset", "and", "or", "not", "for all", "exists", "empty set", "proportional", "angle", "one quarter", "one half", "three quarters", "one third", "two thirds", "squared", "cubed"]) },
  { id: "currency", label: "Currency", items: s("$€£¥¢₹₩₽₺₿฿₫₪₴₦₱", ["dollar", "euro", "pound", "yen", "cent", "rupee", "won", "ruble", "lira", "bitcoin", "baht", "dong", "shekel", "hryvnia", "naira", "peso"]) },
  { id: "greek", label: "Greek", items: s("αβγδεζηθικλμνξοπρστυφχψωΩΣΔΠΦΨΛΘ", ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega", "capital omega", "capital sigma", "capital delta", "capital pi", "capital phi", "capital psi", "capital lambda", "capital theta"]) },
  { id: "latin", label: "Accented letters", items: s("àáâãäåæçèéêëìíîïñòóôõöøœùúûüýÿßÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØŒÙÚÛÜÝŸ", []) },
  { id: "shapes", label: "Shapes", items: s("■□▲△▼▽◆◇●○★☆♠♣♥♦♪♫☑☒", ["black square", "white square", "black up triangle", "white up triangle", "black down triangle", "white down triangle", "black diamond", "white diamond", "black circle", "white circle", "black star", "white star", "spade", "club", "heart suit", "diamond suit", "eighth note", "beamed notes", "checked box", "crossed box"]) },
];

export function searchSymbols(groups: typeof EMOJI_GROUPS, query: string): Glyph[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const out: Glyph[] = [];
  for (const g of groups) for (const it of g.items) if ((it.char === q || it.name.toLowerCase().includes(q)) && !seen.has(it.char)) (seen.add(it.char), out.push(it));
  return out;
}
