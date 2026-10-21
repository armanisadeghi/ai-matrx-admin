#!/usr/bin/env python3
"""features/spaces/templates/build-design-starters.py — THE DESIGN SYSTEM BOARD AND ITS TEN STARTERS

Eleven packs from one readable table of values: the base Design system board (SP0363) and ten starters
(SP0490–SP0499) a person or an agent picks from so nobody starts a design system blank. Same structure
for all: a Cover (hero + principles), Colors, Typography, Spacing, Corner radius, Shadows, Opacity,
Motion, Components, Assets, and a Files page.

ONE TOKEN VOCABULARY. Every pack defines the same token names, so one sample skeleton works on every
board and an agent can adapt any starter without renaming anything:
  colors   COLOR_ROLES below (23 names: background … link, border, input, divider, ring …)
  type      display title heading body label caption code  (+ extras)  → --font-*, --text-*, --leading-*, --weight-*
  spacing   space-1 space-2 space-3 space-4 space-6 space-8 control-height (+ extras) → --space-* …
  radius    radius-sm radius-md radius-lg radius-full  (--radius = radius-md)
  shadow    shadow-sm shadow-md shadow-lg (light and dark; dark adds a hairline ring so elevation shows)
  opacity   opacity-disabled opacity-hover opacity-overlay (+ extras)
  motion    motion-fast motion-base motion-slow (+ extras)
Component samples and the cover hero use ONLY these variables (the html_sample frame turns the board's
rows into them, and loads the Google fonts its type rows name): no hard-coded color, font, size,
spacing, radius, shadow or motion. Personality (copy, which components, shapes, label case) is per
starter, not one skeleton ten times.

CONTRAST. Text roles reach 4.5:1 on what they are read on, Lines roles (border, input, ring) 3:1, in
light AND dark; `--check` prints every promised pair and nothing is written while one fails. The pack
checker enforces the declared `reads_on` pairs for every design pack.

Run:   python3 features/spaces/templates/build-design-starters.py          # writes the ten starters (--with-base: SP0363 too)
       python3 features/spaces/templates/build-design-starters.py --check  # contrast table only
       ... --out DIR   # write there instead of packs/ (covers + versions are still read from packs/)
Then:  pnpm spaces:templates:check <files>; bump VERSION on every published change.
Clean-room: our own words and values; fonts are open-licence Google fonts or system fonts.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PACKS = HERE / "packs"
STARTER_VERSION = 3
BASE_VERSION = 7
TODAY = "2026-10-18"

# ── WCAG contrast (same rounding as @ai-matrx/design-system contrastRatio: floored to one decimal) ──


def _lin(c: float) -> float:
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_: str) -> float:
    h = hex_.lstrip("#")[:6]
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def ratio(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return math.floor(((hi + 0.05) / (lo + 0.05)) * 10 + 1e-9) / 10


# ── Color roles: (name, group, reads_on, default usage note). "Lines" rows are checked at 3:1. ──

COLOR_ROLES = [
    ("background", "Surfaces", None, "The page itself. Everything else sits on it."),
    ("foreground", "Surfaces", "background", "Body text and icons on the page, on cards and on muted fills."),
    ("card", "Surfaces", None, "Raised panels and cards."),
    ("card-foreground", "Surfaces", "card", "Text inside a card."),
    ("popover", "Surfaces", None, "Menus, tooltips and pickers that float over content."),
    ("popover-foreground", "Surfaces", "popover", "Text inside a menu or tooltip."),
    ("muted", "Muted", None, "Quiet fills: table headers, empty states, code blocks."),
    ("muted-foreground", "Muted", "muted", "Hints and captions. Also reads on the page and on cards."),
    ("primary", "Primary", None, "The fill of the one main action. Not a text color: use link."),
    ("primary-foreground", "Primary", "primary", "Label on a primary button."),
    ("secondary", "Secondary", None, "Second actions and quiet selected states."),
    ("secondary-foreground", "Secondary", "secondary", "Label on a secondary button."),
    ("accent", "Accent", None, "Highlights: a selected row, a tip, something new."),
    ("accent-foreground", "Accent", "accent", "Text on an accent fill. Never put plain foreground on accent."),
    ("link", "Accent", "background", "Colored text: links and active tabs. Also reads on cards."),
    ("border", "Lines", "background", "Edges of controls and outline buttons; 3:1 so they are found."),
    ("input", "Lines", "card", "The outline of a field and an off switch."),
    ("divider", "Lines", None, "Hairlines between rows and around cards. Decorative only."),
    ("ring", "Lines", "background", "Keyboard focus. Always visible, never removed."),
    ("destructive", "Feedback", "muted", "Errors and delete. Also reads on the page and on cards."),
    ("destructive-foreground", "Feedback", "destructive", "Label on a delete button."),
    ("success", "Feedback", "muted", "Done, live, saved. Always paired with a word."),
    ("warning", "Feedback", "muted", "Waiting or at risk. Always paired with a word."),
]
LINES = {"border", "input", "ring"}
# The lead colors read first on the Colors table and the gallery card (its thumbnail shows the first four rows).
# ADVERSARIAL-6 F5: a fixed list (primary, accent, secondary, link) put near-white and near-black tints on most cards, so
# the cards looked alike. Now primary leads, then the most colorful of the system's own identity roles, each distinct
# from the ones already picked (lead_colors).
LEAD_CANDIDATES = ["link", "accent", "accent-foreground", "secondary", "secondary-foreground", "ring", "primary-foreground"]
LEAD_COUNT = 4


def _rgb(hex_: str) -> tuple[float, float, float]:
    h = hex_.lstrip("#")[:6]
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore[return-value]


def colorfulness(hex_: str) -> float:
    """How much color a value carries: its chroma (max - min channel), never a near-white or near-black tint."""
    r, g, b = _rgb(hex_)
    return max(r, g, b) - min(r, g, b)


def color_distance(a: str, b: str) -> float:
    return math.dist(_rgb(a), _rgb(b))


def lead_colors(c: dict) -> list[str]:
    """Primary, then the most colorful identity roles (light value), each at least 0.25 away from every pick so far;
    a system with fewer distinct colors fills the rest by colorfulness."""
    picked = ["primary"]
    every = [r[0] for r in COLOR_ROLES]
    # 1. the system's own identity roles; 2. any role (the feedback colors) — both colorful and distinct; 3. the rest.
    for pool, strict in ((LEAD_CANDIDATES, True), (every, True), (LEAD_CANDIDATES + every, False)):
        for n in sorted(pool, key=lambda n: (-colorfulness(c[n][0]), pool.index(n))):
            if len(picked) == LEAD_COUNT:
                return picked
            if n in picked:
                continue
            if not strict or (colorfulness(c[n][0]) >= 0.2 and all(color_distance(c[n][0], c[p][0]) >= 0.25 for p in picked)):
                picked.append(n)
    return picked
# Pairs the samples use beyond the declared ground (checked too).
ALSO = {
    "foreground": [("muted", 4.5), ("card", 4.5), ("secondary", 4.5), ("popover", 4.5)],
    "muted-foreground": [("background", 4.5), ("card", 4.5)],
    "link": [("card", 4.5)],
    "destructive": [("background", 4.5), ("card", 4.5)],
    "success": [("background", 4.5), ("card", 4.5)],
    "warning": [("background", 4.5), ("card", 4.5)],
    "border": [("card", 3.0)],
    "input": [("background", 3.0)],
    "ring": [("card", 3.0)],
    "primary": [("background", 3.0)],  # a filled control is found on the page (WCAG 1.4.11)
}

CORE_TYPE = ["display", "title", "heading", "body", "label", "caption", "code"]
CORE_SPACE = ["space-1", "space-2", "space-3", "space-4", "space-6", "space-8", "control-height"]
CORE_RADIUS = ["radius-sm", "radius-md", "radius-lg", "radius-full"]
CORE_SHADOW = ["shadow-sm", "shadow-md", "shadow-lg"]
CORE_OPACITY = ["opacity-disabled", "opacity-hover", "opacity-overlay"]
CORE_MOTION = ["motion-fast", "motion-base", "motion-slow"]

SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
RING_DARK = (0, 0, 0, 1, "#ffffff14")  # dark grounds hide black shadows: a hairline ring shows the edge


def C(**kv):  # colors: name=(light, dark)
    return {k.replace("_", "-"): v for k, v in kv.items()}


# Each starter: identity, profile (typed, for agents), colors, type rows (name, group, font, weight, size,
# lineHeight, letterSpacing em, note), spacing, radius, shadows (light layers, dark layers), opacity, motion,
# notes (color usage overrides), ui (component personality) and copy.

STARTERS: list[dict] = []

STARTERS.append({
    "slug": "near-blank", "id": "SP0490", "name": "Near blank",
    "description": "The floor: grays, graphite actions and one blue accent. Complete, but plain.",
    "forWho": "Anyone starting a design system from almost nothing",
    "tags": ["design system", "starter", "minimal", "neutral", "any industry", "fallback"],
    "vertical": "Design systems — any brand (the default)",
    "person": "Noor Haddad",
    "studio": ("Plainfield Works", "A two-person app studio that wants a clean starting point.", "plainfieldworks.net", "Hollis Lane", "Columbus", "OH", "43215", "(614) 555-0118", "America/New_York"),
    "profile": {"industries": ["any"], "avoidFor": [], "mood": ["calm"], "formality": 3, "energy": 2, "density": "medium", "shape": "soft", "contrast": "standard", "defaultTheme": "light", "typeClass": "system", "a11y": {"level": "AA", "minTarget": 36, "minBody": 15}, "adaptFirst": ["primary", "link", "ring", "font"], "lockedTokens": ["foreground", "background", "muted-foreground"], "fallback": True, "chromatic": False},
    "principles": ["Start small: add a token only when two screens need it.", "One accent: blue marks links and focus, nothing else.", "Name by role, never by value: primary, not graphite."],
    "hero": {"kicker": "Design system", "head": "Start here.<br>Make it yours.", "tag": "A plain, complete system: grays, one accent and the fewest choices.", "chips": ["Colors", "Type", "Spacing", "Components"], "graphic": "blocks"},
    "colors": C(background=("#ffffff", "#0f0f0f"), foreground=("#171717", "#ededed"), card=("#ffffff", "#171717"), card_foreground=("#171717", "#ededed"),
                popover=("#ffffff", "#1c1c1c"), popover_foreground=("#171717", "#ededed"), muted=("#f4f4f4", "#222222"), muted_foreground=("#5c5c5c", "#a3a3a3"),
                primary=("#262626", "#ededed"), primary_foreground=("#ffffff", "#171717"), secondary=("#efefef", "#262626"), secondary_foreground=("#171717", "#ededed"),
                accent=("#eef3ff", "#1a2333"), accent_foreground=("#1d4fc4", "#a9c2ff"), link=("#2459d6", "#7aa2ff"), border=("#8f8f8f", "#6b6b6b"),
                input=("#737373", "#858585"), divider=("#e4e4e4", "#2c2c2c"), ring=("#2459d6", "#7aa2ff"), destructive=("#c0281b", "#ff8a80"),
                destructive_foreground=("#ffffff", "#2a0704"), success=("#1d7438", "#5fcf86"), warning=("#8c5a00", "#e8b04a")),
    "type": [("display", "Display", SANS, 700, 40, 48, -0.02, "One per page at most."), ("title", "Headings", SANS, 600, 28, 36, -0.01, "The page title."),
             ("heading", "Headings", SANS, 600, 18, 26, 0, "Section headings and card titles."), ("body", "Text", SANS, 400, 15, 24, 0, "Everything people read."),
             ("label", "Text", SANS, 500, 14, 20, 0, "Buttons, field labels and tabs."), ("caption", "Text", SANS, 400, 12, 16, 0.01, "Hints, timestamps, small print."),
             ("code", "Code", MONO, 400, 13, 20, 0, "Code, ids and values people copy.")],
    "spacing": [(4, 8, 12, 16, 24, 32, 36)],
    "radius": [(4, 6, 8)],
    "shadows": [[(0, 1, 2, 0, "#00000014")], [(0, 4, 12, -2, "#0000001a")], [(0, 12, 28, -6, "#0000001f"), (0, 4, 8, -4, "#00000014")]],
    "dark_alpha": "66",
    "opacity": [0.45, 0.08, 0.6],
    "motion": [(120, "ease-out"), (200, "ease-in-out"), (300, "ease-in-out")],
    "notes": {"primary": "Graphite: the fill of the one main action. Swap it for the brand color first."},
    "ui": {"btn_r": "var(--radius-md)", "case": "none", "bw": "1px", "tabs": "underline", "card": "generic"},
    "copy": {"save": "Save", "card": ("Project", "Untitled project", "Created just now", "Open", "Share")},
})

STARTERS.append({
    "slug": "calm-neutral", "id": "SP0491", "name": "Calm neutral",
    "description": "Cool grays, an indigo action and soft cards: the modern software look.",
    "forWho": "Software products and SaaS teams",
    "tags": ["design system", "starter", "saas", "calm", "modern", "software"],
    "vertical": "Design systems — software and SaaS",
    "person": "Tomasz Wierzbicki",
    "studio": ("Lattice Row Software", "A small software company with a web app and a dashboard.", "latticerow.net", "Brannock Street", "Denver", "CO", "80205", "(720) 555-0142", "America/Denver"),
    "profile": {"industries": ["software", "saas", "b2b", "productivity", "startups"], "avoidFor": ["luxury", "children"], "mood": ["calm", "technical"], "formality": 3, "energy": 2, "density": "medium", "shape": "soft", "contrast": "standard", "defaultTheme": "light", "typeClass": "humanist-sans", "a11y": {"level": "AA", "minTarget": 32, "minBody": 14}, "adaptFirst": ["primary", "link", "ring", "accent"], "lockedTokens": ["foreground", "muted-foreground", "border"], "fallback": False, "chromatic": True},
    "principles": ["Clear before clever: every screen says what it is for in its first line.", "Calm by default: color is for meaning, never decoration.", "Numbers first: the figure a person came for is the biggest thing on the card."],
    "hero": {"kicker": "Design system", "head": "Calm screens,<br>clear numbers.", "tag": "Cool grays, one indigo action, soft cards and quiet motion.", "chips": ["Dashboards", "Forms", "Settings"], "graphic": "panels"},
    "colors": C(background=("#fbfcfd", "#0e1117"), foreground=("#1b2130", "#e6e9ef"), card=("#ffffff", "#151922"), card_foreground=("#1b2130", "#e6e9ef"),
                popover=("#ffffff", "#1a1f2a"), popover_foreground=("#1b2130", "#e6e9ef"), muted=("#f1f3f7", "#1c212c"), muted_foreground=("#566072", "#98a1b2"),
                primary=("#4f46e5", "#8b8cf8"), primary_foreground=("#ffffff", "#12123a"), secondary=("#eceff5", "#232937"), secondary_foreground=("#262d3d", "#dfe3ea"),
                accent=("#eef0ff", "#23264a"), accent_foreground=("#3a32b0", "#c7caff"), link=("#4338ca", "#a5a8ff"), border=("#858d9d", "#646c7e"),
                input=("#6b7385", "#7a8396"), divider=("#e3e7ee", "#272d39"), ring=("#5b54e8", "#8b8cf8"), destructive=("#c62f2a", "#f2827b"),
                destructive_foreground=("#ffffff", "#2a0807"), success=("#17744b", "#4fcf91"), warning=("#8f5500", "#f0b24a")),
    "type": [("display", "Display", "Inter, " + SANS, 700, 44, 52, -0.025, "One per page at most: a landing headline."), ("title", "Headings", "Inter, " + SANS, 600, 28, 36, -0.015, "The page title."),
             ("heading", "Headings", "Inter, " + SANS, 600, 18, 26, -0.005, "Section headings and card titles."), ("body", "Text", "Inter, " + SANS, 400, 14, 22, 0, "Everything people read."),
             ("label", "Text", "Inter, " + SANS, 500, 13, 18, 0, "Buttons, field labels and tabs."), ("caption", "Text", "Inter, " + SANS, 400, 12, 16, 0.01, "Timestamps, hints and small print."),
             ("code", "Code", "'JetBrains Mono', " + MONO, 400, 13, 20, 0, "Code, ids and values people copy."), ("metric", "Display", "Inter, " + SANS, 600, 32, 36, -0.02, "The big number on a dashboard card.")],
    "spacing": [(4, 8, 12, 16, 24, 32, 32), ("space-12", 48, "Above a page title.")],
    "radius": [(4, 8, 12)],
    "shadows": [[(0, 1, 2, 0, "#0f172a12")], [(0, 4, 10, -2, "#0f172a14"), (0, 2, 4, -2, "#0f172a0d")], [(0, 16, 32, -8, "#0f172a29"), (0, 6, 12, -4, "#0f172a12")]],
    "dark_alpha": "80",
    "opacity": [0.45, 0.08, 0.5],
    "motion": [(120, "ease-out"), (180, "cubic-bezier(0.2, 0, 0, 1)"), (260, "cubic-bezier(0.2, 0, 0, 1)")],
    "notes": {"primary": "Indigo: the fill of the one main action per screen.", "accent": "A pale indigo wash for selected rows and tips."},
    "ui": {"btn_r": "var(--radius-md)", "case": "none", "bw": "1px", "tabs": "segmented", "card": "metric"},
    "copy": {"save": "Save changes"},
})

STARTERS.append({
    "slug": "editorial", "id": "SP0492", "name": "Editorial",
    "description": "Warm paper, ink and an oxblood accent, with serif headings made for reading.",
    "forWho": "Publishers, writers, journals and cultural brands",
    "tags": ["design system", "starter", "editorial", "serif", "warm", "publishing"],
    "vertical": "Design systems — publishing and media",
    "person": "Marguerite Okonjo",
    "studio": ("Quillstone Review", "A small quarterly that publishes essays online and in print.", "quillstonereview.net", "Ashby Mews", "Providence", "RI", "02903", "(401) 555-0127", "America/New_York"),
    "profile": {"industries": ["publishing", "media", "journals", "books", "museums", "nonprofits", "consulting"], "avoidFor": ["developer tools", "children"], "mood": ["warm", "formal"], "formality": 4, "energy": 2, "density": "airy", "shape": "sharp", "contrast": "standard", "defaultTheme": "light", "typeClass": "serif-editorial", "a11y": {"level": "AA", "minTarget": 36, "minBody": 18}, "adaptFirst": ["primary", "link", "ring"], "lockedTokens": ["background", "foreground", "font-body"], "fallback": False, "chromatic": True},
    "principles": ["Reading comes first: body text is set for long reading, never squeezed.", "Ink on paper: warm grounds, near-black text, one accent used sparingly.", "Hierarchy by type, not boxes: size and weight do the work."],
    "hero": {"kicker": "The house style", "head": "Set for<br>reading.", "tag": "Warm paper, ink-dark text, serif headings and one oxblood accent.", "chips": ["Essays", "Issues", "Newsletters"], "graphic": "columns"},
    "colors": C(background=("#faf7f1", "#17140f"), foreground=("#211b14", "#ece5d8"), card=("#fffdf8", "#1f1b15"), card_foreground=("#211b14", "#ece5d8"),
                popover=("#fffdf8", "#25201a"), popover_foreground=("#211b14", "#ece5d8"), muted=("#f1ebdf", "#29241c"), muted_foreground=("#665847", "#b2a691"),
                primary=("#8a2b1f", "#e8937f"), primary_foreground=("#fffaf3", "#2a0c06"), secondary=("#ebe3d4", "#302a21"), secondary_foreground=("#2b241b", "#e7dfd0"),
                accent=("#f6e7cf", "#3a2e1c"), accent_foreground=("#5a3a10", "#f0d3a6"), link=("#8a2b1f", "#e8937f"), border=("#968872", "#7d705c"),
                input=("#7d705c", "#8f8270"), divider=("#e3dacb", "#352e24"), ring=("#8a2b1f", "#e8937f"), destructive=("#a8241c", "#f08a7e"),
                destructive_foreground=("#fffaf3", "#2a0905"), success=("#3a662c", "#9cc98a"), warning=("#835400", "#e6b45c")),
    "type": [("display", "Display", "Fraunces, 'Iowan Old Style', Georgia, serif", 600, 52, 58, -0.02, "A cover line or an essay title."), ("title", "Headings", "Fraunces, 'Iowan Old Style', Georgia, serif", 600, 32, 40, -0.01, "The page title."),
             ("heading", "Headings", "Fraunces, 'Iowan Old Style', Georgia, serif", 600, 22, 30, 0, "Section headings and teaser titles."), ("body", "Text", "'Source Serif 4', 'Iowan Old Style', Georgia, serif", 400, 18, 30, 0, "Long reading, about 65 characters a line."),
             ("label", "Text", "'Source Sans 3', " + SANS, 600, 12, 16, 0.08, "Kickers, bylines and buttons, in small capitals."), ("caption", "Text", "'Source Sans 3', " + SANS, 400, 13, 18, 0.01, "Captions and credits under images."),
             ("code", "Code", MONO, 400, 14, 22, 0, "Code and values people copy."), ("standfirst", "Text", "'Source Serif 4', 'Iowan Old Style', Georgia, serif", 400, 21, 32, 0, "The opening paragraph under a title.")],
    "spacing": [(4, 8, 12, 16, 24, 40, 40), ("space-16", 64, "Above a title, around a pull quote.")],
    "radius": [(2, 3, 4)],
    "shadows": [[(0, 1, 0, 0, "#3b2a1414")], [(0, 8, 24, -8, "#3b2a1424")], [(0, 20, 48, -16, "#3b2a1433")]],
    "dark_alpha": "80",
    "opacity": [0.5, 0.06, 0.7],
    "motion": [(150, "ease-out"), (240, "ease-in-out"), (400, "ease-in-out")],
    "notes": {"primary": "Oxblood: buttons, the active section and links. Dark enough to read as text.", "accent": "Parchment: a pull quote or an editor's note."},
    "ui": {"btn_r": "var(--radius-sm)", "case": "uppercase", "bw": "1px", "tabs": "underline", "card": "article"},
    "copy": {"save": "Subscribe"},
})

STARTERS.append({
    "slug": "bold-contrast", "id": "SP0493", "name": "Bold high-contrast",
    "description": "Black, white and a hot orange; square corners and hard offset shadows.",
    "forWho": "Brands that want to be loud, direct and unmistakable",
    "tags": ["design system", "starter", "bold", "high contrast", "events", "sport"],
    "vertical": "Design systems — bold brands, events, sport and retail",
    "person": "Kwame Asante-Bell",
    "studio": ("Loudhaus Events", "An events company selling tickets for music nights.", "loudhausevents.net", "Gantry Way", "Detroit", "MI", "48207", "(313) 555-0186", "America/Detroit"),
    "profile": {"industries": ["events", "sport", "music", "streetwear", "campaigns", "retail"], "avoidFor": ["healthcare", "legal", "finance"], "mood": ["loud", "playful"], "formality": 1, "energy": 5, "density": "medium", "shape": "sharp", "contrast": "high", "defaultTheme": "light", "typeClass": "grotesque-display", "a11y": {"level": "AAA-leaning", "minTarget": 40, "minBody": 16}, "adaptFirst": ["primary", "accent", "link"], "lockedTokens": ["foreground", "background", "border", "shadow-sm"], "fallback": False, "chromatic": True},
    "principles": ["Say it once, say it big: one headline, one action per screen.", "Lines, not shades: thick black edges instead of soft grays.", "Orange is a fill, never text: colored words use link."],
    "hero": {"kicker": "Loud by design", "head": "SAY IT<br>ONCE.", "tag": "Black, white, hot orange. Square corners and hard shadows.", "chips": ["Tickets", "Drops", "Posters"], "graphic": "stack"},
    "colors": C(background=("#ffffff", "#000000"), foreground=("#000000", "#ffffff"), card=("#ffffff", "#0d0d0d"), card_foreground=("#000000", "#ffffff"),
                popover=("#ffffff", "#141414"), popover_foreground=("#000000", "#ffffff"), muted=("#f0f0f0", "#1a1a1a"), muted_foreground=("#3a3a3a", "#c4c4c4"),
                primary=("#ff4f00", "#ff5c14"), primary_foreground=("#000000", "#000000"), secondary=("#e8e8e8", "#262626"), secondary_foreground=("#000000", "#ffffff"),
                accent=("#ffe500", "#ffe500"), accent_foreground=("#000000", "#000000"), link=("#c23a00", "#ff8a4d"), border=("#000000", "#ffffff"),
                input=("#262626", "#e0e0e0"), divider=("#1a1a1a", "#e6e6e6"), ring=("#0047ff", "#5c8aff"), destructive=("#c00021", "#ff6b78"),
                destructive_foreground=("#ffffff", "#000000"), success=("#006b2e", "#38e07b"), warning=("#7a4a00", "#ffc233")),
    "type": [("display", "Display", "Archivo, 'Helvetica Neue', Arial, sans-serif", 900, 64, 64, -0.035, "The poster line. One per screen."), ("title", "Headings", "Archivo, 'Helvetica Neue', Arial, sans-serif", 800, 36, 40, -0.02, "The page title."),
             ("heading", "Headings", "Archivo, 'Helvetica Neue', Arial, sans-serif", 800, 20, 24, -0.01, "Section headings, often in capitals."), ("body", "Text", "Archivo, 'Helvetica Neue', Arial, sans-serif", 400, 16, 24, 0, "Everything people read."),
             ("label", "Text", "Archivo, 'Helvetica Neue', Arial, sans-serif", 800, 14, 16, 0.04, "Buttons and tags, in capitals."), ("caption", "Text", "Archivo, 'Helvetica Neue', Arial, sans-serif", 600, 13, 16, 0.02, "Dates, venues and small print."),
             ("code", "Code", "'Space Mono', " + MONO, 400, 14, 20, 0, "Ticket numbers and codes people copy.")],
    "spacing": [(4, 8, 12, 16, 24, 48, 44), ("space-20", 80, "Around a hero.")],
    "radius": [(0, 0, 0)],
    "shadows": [[(3, 3, 0, 0, "#000000ff")], [(6, 6, 0, 0, "#000000ff")], [(10, 10, 0, 0, "#000000ff")]],
    "dark_shadows": [[(3, 3, 0, 0, "#ffffffff")], [(6, 6, 0, 0, "#ffffffff")], [(10, 10, 0, 0, "#ffffffff")]],
    "opacity": [0.4, 0.12, 0.85],
    "motion": [(80, "linear"), (160, "ease-out"), (240, "cubic-bezier(0.7, 0, 0.3, 1)")],
    "notes": {"primary": "Hot orange: a FILL with black labels. As text it fails on white (3.3:1); use link.", "accent": "Yellow sticker fill. Text on it is always accent-foreground (black).", "secondary": "Light gray fill for second actions; foreground reads on it."},
    "ui": {"btn_r": "var(--radius-md)", "case": "uppercase", "bw": "2px", "tabs": "boxed", "card": "ticket", "press": True},
    "copy": {"save": "Get tickets"},
})

STARTERS.append({
    "slug": "soft-rounded", "id": "SP0494", "name": "Soft rounded",
    "description": "Plum, peach and sage pastels, round shapes and gentle, unhurried motion.",
    "forWho": "Lifestyle shops, beauty, gifting and friendly services",
    "tags": ["design system", "starter", "pastel", "rounded", "gentle", "lifestyle"],
    "vertical": "Design systems — lifestyle, beauty and gifting",
    "person": "Ines Carvalho",
    "studio": ("Pebblebloom", "A small shop for handmade gifts and flower boxes.", "pebblebloom.net", "Marigold Court", "Austin", "TX", "78704", "(512) 555-0139", "America/Chicago"),
    "profile": {"industries": ["lifestyle", "beauty", "gifting", "florists", "small shops", "parenting"], "avoidFor": ["finance", "developer tools"], "mood": ["warm", "calm"], "formality": 2, "energy": 2, "density": "airy", "shape": "pill", "contrast": "standard", "defaultTheme": "light", "typeClass": "rounded", "a11y": {"level": "AA", "minTarget": 40, "minBody": 16}, "adaptFirst": ["primary", "secondary", "accent", "link"], "lockedTokens": ["radius-lg", "radius-full", "foreground"], "fallback": False, "chromatic": True},
    "principles": ["Soft edges, firm words: shapes are round, text stays dark.", "Pastel fills, deep text: tints fill, deep colors speak.", "Unhurried: things ease in slowly and never bounce."],
    "hero": {"kicker": "Made gently", "head": "Soft shapes,<br>warm welcome.", "tag": "Plum, peach and sage. Round corners, pill buttons, slow easing.", "chips": ["Gifts", "Bookings", "Wishlists"], "graphic": "pebbles"},
    "colors": C(background=("#fdf8fb", "#1a1319"), foreground=("#3a2236", "#f5e9f2"), card=("#ffffff", "#221a21"), card_foreground=("#3a2236", "#f5e9f2"),
                popover=("#ffffff", "#281f27"), popover_foreground=("#3a2236", "#f5e9f2"), muted=("#f8edf4", "#2c2129"), muted_foreground=("#6e5068", "#c4a9bd"),
                primary=("#a3367f", "#f0a3d6"), primary_foreground=("#ffffff", "#3a0e2c"), secondary=("#ffe9dd", "#3a2a20"), secondary_foreground=("#6b3216", "#ffd2b8"),
                accent=("#e5f2e8", "#1c3022"), accent_foreground=("#1f5a32", "#bfe5c9"), link=("#93286f", "#f0a3d6"), border=("#a08299", "#7d6377"),
                input=("#8c6c84", "#927590"), divider=("#f0e2eb", "#33272f"), ring=("#b8408f", "#f0a3d6"), destructive=("#c2263a", "#ff8f9c"),
                destructive_foreground=("#ffffff", "#3a0710"), success=("#1e7046", "#8fdcb0"), warning=("#8a5806", "#f3c46b")),
    "type": [("display", "Display", "Quicksand, 'Varela Round', 'Avenir Next', " + SANS, 700, 44, 52, -0.01, "A welcome headline."), ("title", "Headings", "Quicksand, 'Varela Round', 'Avenir Next', " + SANS, 700, 28, 36, 0, "The page title."),
             ("heading", "Headings", "Quicksand, 'Varela Round', 'Avenir Next', " + SANS, 700, 19, 28, 0, "Section headings and card titles."), ("body", "Text", "'Nunito Sans', 'Avenir Next', " + SANS, 400, 16, 26, 0, "Everything people read."),
             ("label", "Text", "Quicksand, 'Varela Round', 'Avenir Next', " + SANS, 700, 15, 20, 0, "Buttons, chips and field labels."), ("caption", "Text", "'Nunito Sans', 'Avenir Next', " + SANS, 600, 13, 18, 0, "Hints and small print."),
             ("code", "Code", MONO, 400, 13, 20, 0, "Order numbers people copy.")],
    "spacing": [(4, 8, 12, 20, 28, 40, 44), ("space-12", 56, "Between sections.")],
    "radius": [(12, 20, 28)],
    "shadows": [[(0, 4, 14, -4, "#a3367f14")], [(0, 12, 28, -8, "#a3367f1f")], [(0, 28, 56, -16, "#a3367f29")]],
    "dark_alpha": "80",
    "opacity": [0.5, 0.1, 0.4],
    "motion": [(180, "ease-out"), (320, "cubic-bezier(0.25, 0.1, 0.25, 1)"), (480, "cubic-bezier(0.25, 0.1, 0.25, 1)")],
    "notes": {"primary": "Plum: the fill of the main action and the selected chip.", "secondary": "Peach: second actions and soft highlights.", "accent": "Sage: confirmations and 'in stock' moments."},
    "ui": {"btn_r": "var(--radius-full)", "case": "none", "bw": "1px", "tabs": "pills", "card": "chips"},
    "copy": {"save": "Add to box"},
})

STARTERS.append({
    "slug": "dark-developer", "id": "SP0495", "name": "Dark-first developer tool",
    "description": "Dark by default: near-black panels, a mint action and mono details. Dense.",
    "forWho": "Developer tools, consoles, data and infrastructure products",
    "tags": ["design system", "starter", "dark", "developer", "dense", "technical"],
    "vertical": "Design systems — developer and data tools",
    "person": "Ravi Subramaniam",
    "studio": ("Kernelpine", "A team building a command line and console for data pipelines.", "kernelpine.net", "Foundry Alley", "Seattle", "WA", "98134", "(206) 555-0174", "America/Los_Angeles"),
    "profile": {"industries": ["developer tools", "observability", "data", "security", "infrastructure", "ai tooling"], "avoidFor": ["children", "luxury", "healthcare"], "mood": ["technical", "calm"], "formality": 3, "energy": 3, "density": "compact", "shape": "soft", "contrast": "standard", "defaultTheme": "dark", "typeClass": "mono-technical", "a11y": {"level": "AA", "minTarget": 28, "minBody": 13}, "adaptFirst": ["primary", "ring", "success", "link"], "lockedTokens": ["background", "card", "font-code"], "fallback": False, "chromatic": True},
    "principles": ["Dark first, light equal: every token is chosen on dark and proven on light.", "Dense, not cramped: tight rows, 4.5:1 text and visible focus.", "Mono for machine values: ids, keys, paths and numbers people copy."],
    "hero": {"kicker": "$ design-system --dark", "head": "Built for<br>the terminal.", "tag": "Near-black panels, a mint signal color, dense rows and mono where it matters.", "chips": ["Console", "Logs", "Keys"], "graphic": "terminal"},
    "colors": C(background=("#f7f8fa", "#0b0d10"), foreground=("#11151b", "#d9dfe7"), card=("#ffffff", "#12151a"), card_foreground=("#11151b", "#d9dfe7"),
                popover=("#ffffff", "#161a20"), popover_foreground=("#11151b", "#d9dfe7"), muted=("#eceff3", "#191d23"), muted_foreground=("#505966", "#8d97a5"),
                primary=("#0a7550", "#3ddc97"), primary_foreground=("#ffffff", "#03140c"), secondary=("#e5e8ed", "#1f242c"), secondary_foreground=("#1b2027", "#d9dfe7"),
                accent=("#e3efff", "#16263a"), accent_foreground=("#0b4a8a", "#8cc8ff"), link=("#0a5fb4", "#8cc8ff"), border=("#878f9c", "#5d6776"),
                input=("#6c7480", "#6f7a8a"), divider=("#dce0e6", "#242a33"), ring=("#0a7550", "#3ddc97"), destructive=("#bf2a2a", "#ff7a7a"),
                destructive_foreground=("#ffffff", "#1a0505"), success=("#0a7550", "#3ddc97"), warning=("#855000", "#ffb454")),
    "type": [("display", "Display", "Inter, " + SANS, 700, 32, 38, -0.02, "A console's empty-state line."), ("title", "Headings", "Inter, " + SANS, 600, 22, 28, -0.01, "The page title."),
             ("heading", "Headings", "Inter, " + SANS, 600, 15, 22, 0, "Panel and section headings."), ("body", "Text", "Inter, " + SANS, 400, 13, 20, 0, "Everything people read; the default size."),
             ("label", "Text", "Inter, " + SANS, 500, 12, 16, 0, "Buttons, field labels and column headers."), ("caption", "Text", "Inter, " + SANS, 400, 11, 14, 0.02, "Timestamps and status lines."),
             ("code", "Code", "'JetBrains Mono', " + MONO, 400, 12.5, 18, 0, "Code, logs, ids and keys."), ("code-block", "Code", "'JetBrains Mono', " + MONO, 400, 13, 20, 0, "Multi-line code and terminal output.")],
    "spacing": [(2, 4, 6, 8, 12, 16, 28), ("space-12", 24, "Between sections.")],
    "radius": [(3, 6, 8)],
    "shadows": [[(0, 1, 2, 0, "#0b0d1014")], [(0, 8, 20, -6, "#0b0d1029")], [(0, 20, 40, -12, "#0b0d1033")]],
    "dark_shadows": [[(0, 0, 0, 1, "#ffffff12")], [(0, 8, 24, -6, "#000000cc"), (0, 0, 0, 1, "#ffffff17")], [(0, 20, 48, -12, "#000000e6"), (0, 0, 0, 1, "#ffffff1f")]],
    "opacity": [0.4, 0.06, 0.6],
    "motion": [(80, "linear"), (140, "cubic-bezier(0.2, 0, 0, 1)"), (200, "cubic-bezier(0.2, 0, 0, 1)")],
    "notes": {"primary": "Mint: the run button and live signals.", "success": "Same mint as primary: green means running or passed."},
    "ui": {"btn_r": "var(--radius-md)", "case": "none", "bw": "1px", "tabs": "underline", "card": "code"},
    "copy": {"save": "Run"},
})

STARTERS.append({
    "slug": "trust", "id": "SP0496", "name": "Trust",
    "description": "Sober navy, crisp white and conservative corners for money and law.",
    "forWho": "Finance, legal, insurance and professional services",
    "tags": ["design system", "starter", "trust", "finance", "legal", "conservative"],
    "vertical": "Design systems — finance, legal and insurance",
    "person": "Eleanor Mbeki-Shaw",
    "studio": ("Harrowgate Partners", "A small firm handling wills, estates and family trusts.", "harrowgatepartners.net", "Calloway Square", "Richmond", "VA", "23219", "(804) 555-0191", "America/New_York"),
    "profile": {"industries": ["banking", "accounting", "law", "insurance", "wealth", "government", "enterprise"], "avoidFor": ["children", "entertainment"], "mood": ["formal", "calm"], "formality": 5, "energy": 1, "density": "medium", "shape": "sharp", "contrast": "high", "defaultTheme": "light", "typeClass": "serif-editorial", "a11y": {"level": "AAA-leaning", "minTarget": 36, "minBody": 15}, "adaptFirst": ["accent", "link", "ring"], "lockedTokens": ["primary", "foreground", "font-label"], "fallback": False, "chromatic": True},
    "principles": ["Exact over exciting: figures line up, labels say precisely what a number is.", "Nothing surprising: every action says what happens before it happens.", "Quiet authority: navy and white, one warm accent, square-ish corners."],
    "hero": {"kicker": "Since the first ledger", "head": "Exact,<br>steady, clear.", "tag": "Navy and white, tabular figures and nothing that feels like a gamble.", "chips": ["Statements", "Matters", "Accounts"], "graphic": "ledger"},
    "colors": C(background=("#ffffff", "#0a1220"), foreground=("#0f1d33", "#e3e8ef"), card=("#ffffff", "#101a2c"), card_foreground=("#0f1d33", "#e3e8ef"),
                popover=("#ffffff", "#132036"), popover_foreground=("#0f1d33", "#e3e8ef"), muted=("#f1f4f8", "#16223a"), muted_foreground=("#4b586b", "#a1aec3"),
                primary=("#12305e", "#93b5ec"), primary_foreground=("#ffffff", "#0a1730"), secondary=("#e7ecf3", "#1b2944"), secondary_foreground=("#12305e", "#d9e2ef"),
                accent=("#f4efe2", "#2b2616"), accent_foreground=("#5c4a1a", "#e6d6a8"), link=("#1d4f9e", "#93b5ec"), border=("#7a8494", "#5c6e90"),
                input=("#646e7e", "#6c7fa3"), divider=("#d8dee7", "#24324e"), ring=("#2a5db0", "#93b5ec"), destructive=("#a51d24", "#f28b8b"),
                destructive_foreground=("#ffffff", "#2b0708"), success=("#1d6843", "#78c9a0"), warning=("#835600", "#e3b55a")),
    "type": [("display", "Display", "'IBM Plex Serif', Georgia, 'Times New Roman', serif", 600, 40, 48, -0.01, "A report cover or a landing headline."), ("title", "Headings", "'IBM Plex Serif', Georgia, 'Times New Roman', serif", 600, 28, 36, 0, "The page title."),
             ("heading", "Headings", "'IBM Plex Sans', " + SANS, 600, 17, 24, 0, "Section headings and card titles."), ("body", "Text", "'IBM Plex Sans', " + SANS, 400, 15, 24, 0, "Everything people read."),
             ("label", "Text", "'IBM Plex Sans', " + SANS, 600, 14, 20, 0, "Buttons, field labels and column headers."), ("caption", "Text", "'IBM Plex Sans', " + SANS, 400, 12, 16, 0.01, "Footnotes, sources and small print."),
             ("code", "Code", "'IBM Plex Mono', " + MONO, 400, 13, 20, 0, "Reference numbers and account ids."), ("figure", "Text", "'IBM Plex Sans', " + SANS, 500, 15, 24, 0, "Amounts and dates, tabular figures, right aligned.")],
    "spacing": [(4, 8, 12, 16, 24, 40, 36)],
    "radius": [(2, 4, 6)],
    "shadows": [[(0, 1, 1, 0, "#0f1d3314")], [(0, 6, 16, -4, "#0f1d3324")], [(0, 16, 36, -10, "#0f1d332e")]],
    "dark_alpha": "a6",
    "opacity": [0.5, 0.05, 0.6],
    "motion": [(120, "ease-out"), (200, "ease-in-out"), (280, "ease-in-out")],
    "notes": {"primary": "Navy: the main action, dark enough to also read as text.", "accent": "Parchment: notices and signed-document highlights, never decoration."},
    "ui": {"btn_r": "var(--radius-md)", "case": "none", "bw": "1px", "tabs": "underline", "card": "statement"},
    "copy": {"save": "Approve transfer"},
})

STARTERS.append({
    "slug": "care", "id": "SP0497", "name": "Care",
    "description": "Calm lagoon blue, warm peach, 17px text and 44px targets, accessible by default.",
    "forWho": "Healthcare, clinics, therapy, wellness and care services",
    "tags": ["design system", "starter", "healthcare", "wellness", "accessible", "large text"],
    "vertical": "Design systems — healthcare and wellness",
    "person": "Amara Lindqvist",
    "studio": ("Willowmere Family Clinic", "A family clinic with online booking and a patient portal.", "willowmereclinic.net", "Larkspur Road", "Minneapolis", "MN", "55408", "(612) 555-0153", "America/Chicago"),
    "profile": {"industries": ["clinics", "hospitals", "therapy", "pharmacy", "elder care", "wellness", "public services"], "avoidFor": ["nightlife", "gaming"], "mood": ["caring", "calm"], "formality": 3, "energy": 2, "density": "airy", "shape": "round", "contrast": "high", "defaultTheme": "light", "typeClass": "humanist-sans", "a11y": {"level": "AAA-leaning", "minTarget": 44, "minBody": 17}, "adaptFirst": ["primary", "link", "accent"], "lockedTokens": ["text-body", "text-label", "control-height", "foreground"], "fallback": False, "chromatic": True},
    "principles": ["Readable by everyone: 17px text, high contrast, plain words.", "Calm, then clear: alarms are rare, so they are noticed.", "Easy to hit: everything a person presses is at least 44 pixels tall."],
    "hero": {"kicker": "Here to help", "head": "Easy to read,<br>easy to reach.", "tag": "Lagoon blue and warm peach, large text and big, calm targets.", "chips": ["Appointments", "Results", "Messages"], "graphic": "circles"},
    "colors": C(background=("#f6fafb", "#0c1619"), foreground=("#0f2a33", "#e0eef2"), card=("#ffffff", "#122025"), card_foreground=("#0f2a33", "#e0eef2"),
                popover=("#ffffff", "#16262c"), popover_foreground=("#0f2a33", "#e0eef2"), muted=("#e8f2f5", "#182b31"), muted_foreground=("#3a5963", "#a6c3cc"),
                primary=("#0a6580", "#7fd0e6"), primary_foreground=("#ffffff", "#05222b"), secondary=("#dfeef2", "#1d3339"), secondary_foreground=("#0f2a33", "#d6eaf0"),
                accent=("#fdf0e3", "#33261a"), accent_foreground=("#773c0d", "#f6cfa8"), link=("#0a5d76", "#8fd8ec"), border=("#6b8790", "#5f7d86"),
                input=("#56727b", "#6f8f98"), divider=("#d0e1e6", "#243a40"), ring=("#0a6580", "#7fd0e6"), destructive=("#ab2219", "#ff958b"),
                destructive_foreground=("#ffffff", "#2a0806"), success=("#1c6636", "#86d6a0"), warning=("#7f4d00", "#f0bf6b")),
    "type": [("display", "Display", "'Atkinson Hyperlegible', " + SANS, 700, 40, 50, -0.01, "A welcome line. One per page at most."), ("title", "Headings", "'Atkinson Hyperlegible', " + SANS, 700, 30, 38, 0, "The page title."),
             ("heading", "Headings", "'Atkinson Hyperlegible', " + SANS, 700, 21, 30, 0, "Section headings and card titles."), ("body", "Text", "'Atkinson Hyperlegible', " + SANS, 400, 17, 28, 0, "Everything people read. Never smaller."),
             ("label", "Text", "'Atkinson Hyperlegible', " + SANS, 700, 16, 22, 0, "Buttons, badges and field labels."), ("caption", "Text", "'Atkinson Hyperlegible', " + SANS, 400, 16, 22, 0.01, "Hints; the smallest size used is 16."),
             ("code", "Code", MONO, 400, 16, 24, 0, "Booking and reference numbers.")],
    "spacing": [(4, 8, 12, 20, 32, 48, 44)],
    "radius": [(8, 12, 18)],
    "shadows": [[(0, 1, 3, 0, "#0f2a3314")], [(0, 8, 20, -6, "#0f2a3324")], [(0, 16, 36, -10, "#0f2a332e")]],
    "dark_alpha": "a6",
    "opacity": [0.55, 0.08, 0.5],
    "motion": [(150, "ease-out"), (250, "ease-in-out"), (320, "ease-in-out"), ("motion-reduced", 0, "linear", "What every motion becomes when a person asks for less motion.")],
    "notes": {"primary": "Lagoon blue: the main action; dark enough for white text and for links.", "accent": "Warm peach: reassurance notes and next steps."},
    "ui": {"btn_r": "var(--radius-md)", "case": "none", "bw": "2px", "tabs": "segmented", "card": "appointment", "big": True},
    "copy": {"save": "Book appointment"},
})

STARTERS.append({
    "slug": "playful", "id": "SP0498", "name": "Playful consumer",
    "description": "Coral, sunny yellow and sky blue with pill buttons and a bounce in its step.",
    "forWho": "Consumer apps, games, food and delivery, social products",
    "tags": ["design system", "starter", "playful", "colorful", "consumer", "food"],
    "vertical": "Design systems — consumer apps, food and games",
    "person": "Leilani Kahale",
    "studio": ("Snackjar", "A delivery app for small neighbourhood bakeries.", "snackjarapp.net", "Peppercorn Avenue", "San Diego", "CA", "92104", "(619) 555-0165", "America/Los_Angeles"),
    "profile": {"industries": ["consumer apps", "food", "delivery", "games", "social", "entertainment", "kids brands"], "avoidFor": ["legal", "finance", "healthcare"], "mood": ["playful", "loud"], "formality": 1, "energy": 5, "density": "medium", "shape": "pill", "contrast": "standard", "defaultTheme": "light", "typeClass": "rounded", "a11y": {"level": "AA", "minTarget": 40, "minBody": 16}, "adaptFirst": ["primary", "secondary", "accent", "link"], "lockedTokens": ["primary-foreground", "motion-base"], "fallback": False, "chromatic": True},
    "principles": ["Joy in the details: a bounce, a color, a friendly word.", "Bright fills, dark words: labels on coral and yellow stay dark; colored text uses link.", "Big and tappable: pill buttons, chunky controls."],
    "hero": {"kicker": "Fresh out the oven", "head": "Little joys,<br>delivered.", "tag": "Coral, sunshine and sky blue. Pills, chunky shadows, a bounce.", "chips": ["Order", "Track", "Rate"], "graphic": "confetti"},
    "colors": C(background=("#fffaf4", "#1a1424"), foreground=("#241a33", "#f6eefb"), card=("#ffffff", "#231a31"), card_foreground=("#241a33", "#f6eefb"),
                popover=("#ffffff", "#2a2039"), popover_foreground=("#241a33", "#f6eefb"), muted=("#fff0e2", "#2d2340"), muted_foreground=("#6a5263", "#c2b3cf"),
                primary=("#f2434f", "#ff7a7f"), primary_foreground=("#2a0a0c", "#2a0a0c"), secondary=("#ffdf5e", "#3a3010"), secondary_foreground=("#3d2e00", "#ffe27a"),
                accent=("#cfe7ff", "#1a3558"), accent_foreground=("#0b3e75", "#bcdcff"), link=("#b8203a", "#ff9aa0"), border=("#9b8796", "#7c6c90"),
                input=("#84707f", "#8c7ca0"), divider=("#f1e1d3", "#3a2e4f"), ring=("#2f6bff", "#7aa6ff"), destructive=("#be1c3a", "#ff8aa0"),
                destructive_foreground=("#ffffff", "#33060f"), success=("#15724a", "#6fdc9f"), warning=("#8a5300", "#ffc15c")),
    "type": [("display", "Display", "'Baloo 2', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif", 800, 48, 52, -0.01, "A big friendly headline. One per screen."), ("title", "Headings", "'Baloo 2', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif", 800, 30, 36, 0, "The page title."),
             ("heading", "Headings", "'Baloo 2', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif", 700, 21, 26, 0, "Section headings and card titles."), ("body", "Text", "'Nunito Sans', " + SANS, 400, 16, 24, 0, "Everything people read."),
             ("label", "Text", "'Nunito Sans', " + SANS, 800, 15, 18, 0.01, "Buttons, chips and tabs."), ("caption", "Text", "'Nunito Sans', " + SANS, 600, 13, 18, 0, "Prices, times and small print."),
             ("code", "Code", MONO, 400, 14, 20, 0, "Promo codes and order numbers.")],
    "spacing": [(4, 8, 12, 16, 24, 40, 44)],
    "radius": [(8, 14, 22)],
    "shadows": [[(0, 3, 0, 0, "#241a3326")], [(0, 10, 22, -6, "#f2434f33")], [(0, 20, 40, -10, "#241a3333")]],
    "dark_shadows": [[(0, 3, 0, 0, "#000000b3"), RING_DARK], [(0, 10, 22, -6, "#000000a6"), RING_DARK], [(0, 20, 40, -10, "#000000cc"), RING_DARK]],
    "opacity": [0.45, 0.12, 0.45],
    "motion": [(120, "ease-out"), (320, "cubic-bezier(0.34, 1.56, 0.64, 1)"), (220, "ease-in-out")],
    "notes": {"primary": "Coral: a FILL with dark labels. As text it fails (2.9:1); use link.", "secondary": "Sunshine: second actions and stickers, always with secondary-foreground.", "accent": "Sky: info chips and the delivery map."},
    "ui": {"btn_r": "var(--radius-full)", "case": "none", "bw": "2px", "tabs": "pills", "card": "product", "chunky": True},
    "copy": {"save": "Add to bag"},
})

STARTERS.append({
    "slug": "premium", "id": "SP0499", "name": "Premium",
    "description": "Ivory, near-black and muted gold; fine serif type, sharp corners, slow motion.",
    "forWho": "Luxury, hospitality, jewellery, fashion and fine goods",
    "tags": ["design system", "starter", "premium", "luxury", "restrained", "fine type"],
    "vertical": "Design systems — luxury and hospitality",
    "person": "Sebastien Aurelio Marchand",
    "studio": ("Maison Verelle", "A small hotel and restaurant with an online booking page.", "maisonverelle.net", "Rue Orsanne", "New Orleans", "LA", "70116", "(504) 555-0108", "America/Chicago"),
    "profile": {"industries": ["hotels", "restaurants", "fashion", "jewellery", "real estate", "galleries", "private banking"], "avoidFor": ["children", "discount retail"], "mood": ["luxurious", "formal"], "formality": 5, "energy": 1, "density": "airy", "shape": "sharp", "contrast": "high", "defaultTheme": "light", "typeClass": "display-serif", "a11y": {"level": "AA", "minTarget": 44, "minBody": 16}, "adaptFirst": ["accent", "ring", "link"], "lockedTokens": ["primary", "background", "font-display"], "fallback": False, "chromatic": False},
    "principles": ["Less, better: one image, one line, one action.", "Type is the ornament: fine serifs, wide tracking on small capitals.", "Unhurried: slower motion and generous space signal care."],
    "hero": {"kicker": "Maison", "head": "Quiet<br>excellence.", "tag": "Ivory and ink, a line of gold, and room to breathe.", "chips": ["Reserve", "Suites", "Dining"], "graphic": "frame"},
    "colors": C(background=("#fcfbf8", "#0d0c0b"), foreground=("#141210", "#eae6de"), card=("#ffffff", "#151412"), card_foreground=("#141210", "#eae6de"),
                popover=("#ffffff", "#1a1916"), popover_foreground=("#141210", "#eae6de"), muted=("#f3f0ea", "#1d1b18"), muted_foreground=("#5c564c", "#a39d92"),
                primary=("#141210", "#e8dfcc"), primary_foreground=("#fcfbf8", "#141210"), secondary=("#efebe3", "#23211d"), secondary_foreground=("#141210", "#eae6de"),
                accent=("#c9a961", "#b8975a"), accent_foreground=("#141210", "#141210"), link=("#7a5c22", "#d9bf86"), border=("#8e8679", "#6a6459"),
                input=("#776f63", "#7d776b"), divider=("#e6e0d4", "#2a2723"), ring=("#8f7035", "#c9a961"), destructive=("#8f1d1d", "#e8968c"),
                destructive_foreground=("#ffffff", "#240807"), success=("#2e5b39", "#93c4a0"), warning=("#76510f", "#d9b26a")),
    "type": [("display", "Display", "'Cormorant Garamond', Didot, 'Bodoni 72', Georgia, serif", 500, 60, 64, -0.01, "The one line on a hero image."), ("title", "Headings", "'Cormorant Garamond', Didot, 'Bodoni 72', Georgia, serif", 500, 36, 44, 0, "The page title."),
             ("heading", "Headings", "'Cormorant Garamond', Didot, 'Bodoni 72', Georgia, serif", 600, 24, 32, 0, "Section headings and card titles."), ("body", "Text", "Jost, Futura, 'Century Gothic', 'Avenir Next', sans-serif", 400, 16, 28, 0.01, "Everything people read."),
             ("label", "Text", "Jost, Futura, 'Century Gothic', 'Avenir Next', sans-serif", 500, 12, 16, 0.18, "Small capitals: buttons, menus and the line above a title."), ("caption", "Text", "Jost, Futura, 'Century Gothic', 'Avenir Next', sans-serif", 400, 13, 20, 0.02, "Captions and small print."),
             ("code", "Code", MONO, 400, 13, 20, 0, "Booking references.")],
    "spacing": [(4, 8, 16, 24, 48, 96, 48)],
    "radius": [(0, 1, 2)],
    "shadows": [[(0, 1, 2, 0, "#1412100d")], [(0, 8, 24, -12, "#14121014")], [(0, 24, 60, -20, "#1412101f")]],
    "dark_alpha": "99",
    "opacity": [0.4, 0.1, 0.7, ("opacity-veil", 0.35, "The dark veil over a hero image so its line reads.")],
    "motion": [(240, "ease-out"), (420, "cubic-bezier(0.22, 0.61, 0.36, 1)"), (700, "cubic-bezier(0.22, 0.61, 0.36, 1)")],
    "notes": {"primary": "Ink: the one main action. Gold never fills a button.", "accent": "Muted gold: a single rule, a selected date, the focus ring's family.", "link": "Antique gold, dark enough to read: links and the active tab."},
    "ui": {"btn_r": "var(--radius-md)", "case": "uppercase", "bw": "1px", "tabs": "underline", "card": "booking"},
    "copy": {"save": "Reserve"},
})

BASE = {
    "slug": "base", "id": "SP0363", "name": "Design system", "file": "design-system-board.pack.json", "base": True,
    "title": "Design system board",
    "description": "Product teams: colors, type, spacing, corners and shadows as one editable board.",
    "forWho": "Product teams keeping one design system",
    "tags": ["design", "tokens", "colors", "typography", "board", "ui"],
    "vertical": "Design systems",
    "useCase": "Ilse Marchetti keeps her studio's colors, type, spacing, corners and shadows in one place her team edits.",
    "why": "Ilse keeps the surfaces to a handful so screens stay calm.",
    "studio": ("Fernwick Design Co.", "A small product design studio that keeps one design system for its apps.", "fernwick.net", "Quillan Row", "Portland", "OR", "97211", "(503) 555-0163", "America/Los_Angeles"),
    "line1": "27 Quillan Row",
    "profile": {"industries": ["product teams", "software", "agencies"], "avoidFor": [], "mood": ["calm"], "formality": 3, "energy": 2, "density": "medium", "shape": "soft", "contrast": "standard", "defaultTheme": "light", "typeClass": "system", "a11y": {"level": "AA", "minTarget": 32, "minBody": 15}, "adaptFirst": ["primary", "link", "ring"], "lockedTokens": [], "fallback": False, "chromatic": True},
    "principles": ["**Clear before clever.** Every screen says what it is for in its first line.", "**One way to do one thing.** A color, a size or a component has one name.", "**Calm by default.** Color is for meaning, never for decoration."],
    "hero": {"kicker": "Design system", "head": "One look,<br>every screen.", "tag": "The colors, type, spacing and components every screen is built from, kept in one place.", "chips": ["Colors", "Typography", "Spacing", "Components"], "graphic": "blocks"},
    "colors": C(background=("#ffffff", "#0b0d12"), foreground=("#111827", "#e8ebf1"), card=("#ffffff", "#141821"), card_foreground=("#111827", "#e8ebf1"),
                popover=("#ffffff", "#181d27"), popover_foreground=("#111827", "#e8ebf1"), muted=("#f1f4f8", "#1c212c"), muted_foreground=("#5f6878", "#9aa3b5"),
                primary=("#2f5bea", "#6d8dff"), primary_foreground=("#ffffff", "#0b1230"), secondary=("#eef1f6", "#222836"), secondary_foreground=("#1f2633", "#dfe3ea"),
                accent=("#eef3ff", "#1e2647"), accent_foreground=("#2342b8", "#c3d0ff"), link=("#2547c9", "#8aa4ff"), border=("#8a93a5", "#5d6679"),
                input=("#646d80", "#8d97aa"), divider=("#e2e6ee", "#262c38"), ring=("#2f5bea", "#8aa4ff"), destructive=("#c62828", "#f47a7a"),
                destructive_foreground=("#ffffff", "#2a0808"), success=("#18794e", "#4ccf8f"), warning=("#92560a", "#f0b24a")),
    "type": [("display", "Display", SANS, 700, 48, 56, -0.02, "One per page at most: a landing headline."), ("title", "Headings", SANS, 600, 30, 38, -0.01, "The page title."),
             ("heading", "Headings", SANS, 600, 20, 28, 0, "Section headings inside a page."), ("body", "Text", SANS, 400, 15, 24, 0, "Everything people read."),
             ("label", "Text", SANS, 500, 13, 18, 0, "Buttons, field labels and tabs."), ("caption", "Text", SANS, 500, 12, 16, 0.02, "Labels over values, timestamps, small print."),
             ("code", "Code", MONO, 400, 13, 20, 0, "Code, ids and values people copy.")],
    "spacing": [(4, 8, 12, 16, 24, 32, 32)],
    "radius": [(4, 8, 12)],
    "shadows": [[(0, 1, 2, 0, "#0f172a14")], [(0, 4, 8, -2, "#0f172a1a"), (0, 2, 4, -2, "#0f172a0f")], [(0, 16, 32, -8, "#0f172a2e"), (0, 6, 12, -4, "#0f172a14")]],
    "dark_alpha": "80",
    "opacity": [0.45, 0.08, 0.5],
    "motion": [(120, "ease-out"), (180, "cubic-bezier(0.2, 0, 0, 1)"), (260, "cubic-bezier(0.2, 0, 0, 1)")],
    "notes": {},
    "ui": {"btn_r": "var(--radius-md)", "case": "none", "bw": "1px", "tabs": "underline", "card": "generic", "catalogue": True},
    "copy": {"save": "Save", "card": ("Report", "Quarterly report", "Updated 2 hours ago by Dana", "Open", "Share")},
}

ALL = [BASE] + STARTERS

# ── Component samples: tokens only. ──────────────────────────────────────────────────────────────

FOCUS = "outline:none;box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--ring)"
W = (".w{font-family:var(--font-body);font-size:var(--text-body);line-height:var(--leading-body);color:var(--foreground)}")


def btn_css(s: dict) -> str:
    u = s["ui"]
    press = (".b:active{transform:translate(2px,2px);box-shadow:none}.p,.s,.d{box-shadow:var(--shadow-sm)}.p:hover,.p.h{background:var(--accent);color:var(--accent-foreground)}"
             if u.get("press") else
             ".p:hover,.p.h{box-shadow:inset 0 0 0 999px color-mix(in srgb,var(--primary-foreground) calc(var(--opacity-hover) * 100%),transparent)}")
    chunky = ".p,.s{box-shadow:var(--shadow-sm)}" if u.get("chunky") else ""
    return (
        W + f".r{{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center}}"
        f".b{{font-family:var(--font-label);font-size:var(--text-label);font-weight:var(--weight-label);line-height:var(--leading-label);letter-spacing:var(--tracking-label);"
        f"text-transform:{u['case']};min-height:var(--control-height);padding:0 var(--space-4);border-radius:{u['btn_r']};border:{u['bw']} solid transparent;cursor:pointer;"
        f"transition:background-color var(--motion-fast),box-shadow var(--motion-fast),transform var(--motion-fast)}}"
        f".b:focus-visible,.b.f{{{FOCUS}}}.b:disabled{{opacity:var(--opacity-disabled);cursor:not-allowed}}"
        ".p{background:var(--primary);color:var(--primary-foreground)}.s{background:var(--secondary);color:var(--secondary-foreground)}"
        ".o{background:transparent;color:var(--foreground);border-color:var(--border)}.q{background:transparent;color:var(--link)}"
        ".d{background:var(--destructive);color:var(--destructive-foreground)}" + press + chunky
    )


def tabs(s: dict, items: list[str]) -> str:
    kind = s["ui"]["tabs"]
    base = (W + f".t{{display:flex;gap:var(--space-1);font-family:var(--font-label);font-size:var(--text-label);font-weight:var(--weight-label);letter-spacing:var(--tracking-label);text-transform:{s['ui']['case']}}}"
            ".t [role=tab]{font:inherit;letter-spacing:inherit;text-transform:inherit;background:transparent;border:0;cursor:pointer;color:var(--muted-foreground);min-height:var(--control-height);padding:0 var(--space-3);transition:color var(--motion-fast),background-color var(--motion-fast)}"
            f".t [role=tab]:focus-visible{{{FOCUS}}}.t [aria-selected=true]{{color:var(--foreground)}}")
    style = {
        "underline": ".t{border-bottom:1px solid var(--divider)}.t [role=tab]{border-bottom:2px solid transparent;margin-bottom:-1px}.t [aria-selected=true]{border-bottom-color:var(--link);color:var(--link)}",
        "segmented": ".t{display:inline-flex;padding:var(--space-1);border-radius:var(--radius-md);background:var(--muted)}.t [role=tab]{border-radius:var(--radius-sm)}.t [aria-selected=true]{background:var(--card);box-shadow:var(--shadow-sm)}",
        "pills": ".t{gap:var(--space-2)}.t [role=tab]{border-radius:var(--radius-full);border:1px solid var(--border)}.t [aria-selected=true]{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}",
        "boxed": ".t [role=tab]{border:2px solid var(--border);margin-right:-2px;color:var(--foreground)}.t [aria-selected=true]{background:var(--foreground);color:var(--background)}",
    }[kind]
    buttons = "".join(f'<button role="tab" aria-selected="{"true" if i == 0 else "false"}">{x}</button>' for i, x in enumerate(items))
    return f"<style>{base}{style}</style><div class=\"w\"><div class=\"t\" role=\"tablist\" aria-label=\"Sections\">{buttons}</div></div>"


COPY = {
    "near-blank": dict(variants=["Cancel", "Edit", "Learn more", "Delete"], field=("Name", "Untitled", "Shown on the first page.", "Email", "name@", "Enter a full email address."), badges=["Draft", "New", "Done", "Paused", "Failed"], toggles=[("Notifications", "When something changes"), ("Weekly summary", "Mondays"), ("Two-step sign-in", "Needs a phone")], faq=[("What is this?", "A starting point. Change anything."), ("Where do I start?", "Primary color, then the font."), ("Can I undo?", "Yes, from each row's history.")], tabs=["Overview", "Activity", "Settings"]),
    "calm-neutral": dict(variants=["Invite", "Export", "View docs", "Remove seat"], field=("Workspace name", "Lattice Row", "Your team sees this name.", "Billing email", "billing@", "Use an address that receives mail."), badges=["Trial", "New", "Active", "Past due", "Canceled"], toggles=[("Usage alerts", "At 80% of your plan"), ("Weekly report", "Every Monday, 9:00"), ("Single sign-on", "Available on Business")], faq=[("How is a seat counted?", "One per person who signed in this month."), ("Can I change plans?", "Any time; we prorate the difference."), ("Where is my invoice?", "Billing, then History.")], tabs=["Overview", "Usage", "Billing", "Members"]),
    "editorial": dict(variants=["Read later", "Share", "All essays", "Unpublish"], field=("Your email", "reader@", "One letter each issue. No noise.", "Name", "", "Tell us what to call you."), badges=["Essay", "New issue", "Published", "In edit", "Withdrawn"], toggles=[("The weekly letter", "Sundays, one essay"), ("New issue alerts", "Four times a year"), ("Comments", "Members only")], faq=[("Who writes for the Review?", "Essayists, critics and the occasional poet."), ("Can I pitch?", "Yes. One paragraph, by letter."), ("Is there print?", "Each issue, in a limited run.")], tabs=["Essays", "Reviews", "Letters", "Archive"]),
    "bold-contrast": dict(variants=["Line-up", "Share", "Venue info", "Cancel order"], field=("Promo code", "LOUD24", "Codes are case sensitive.", "Mobile", "555-01", "Enter all ten digits."), badges=["Presale", "New", "On sale", "Few left", "Sold out"], toggles=[("Drop alerts", "The moment tickets go live"), ("Set-time texts", "An hour before doors"), ("Resale", "Opens a week before")], faq=[("When do doors open?", "8 PM; doors close at 11 PM."), ("Can I resell?", "Yes, through your tickets page."), ("Age limit?", "18 and over. Bring ID.")], tabs=["Headliners", "Club nights", "Sold out"]),
    "soft-rounded": dict(variants=["Gift note", "Save", "Browse", "Remove"], field=("Gift message", "Happy birthday!", "We hand-write it on a card.", "Delivery date", "", "Pick a date at least two days out."), badges=["Handmade", "New", "In stock", "Few left", "Sold out"], toggles=[("Gift wrap", "Kraft paper and ribbon"), ("Surprise me", "Let us pick the flowers"), ("Same-day", "Order before noon")], faq=[("How fresh are the flowers?", "Cut the morning they ship."), ("Can I change the date?", "Up to a day before."), ("Do you deliver far?", "Within 30 miles of Austin.")], tabs=["Boxes", "Flowers", "Cards"]),
    "dark-developer": dict(variants=["Logs", "Copy ID", "Docs", "Revoke key"], field=("Pipeline", "nightly-etl", "Lowercase, dashes, no spaces.", "Cron", "* * *", "Five fields: minute hour day month weekday."), badges=["queued", "new", "passing", "slow", "failed"], toggles=[("Run on push", "main and release/*"), ("Notify on fail", "#data-alerts"), ("Auto-retry", "Up to 3 times")], faq=[("Where are logs kept?", "30 days, then archived."), ("Rate limit?", "600 requests a minute per key."), ("Self-hosted?", "Yes, one container.")], tabs=["Runs", "Logs", "Keys", "Settings"]),
    "trust": dict(variants=["Download PDF", "Schedule", "Fee schedule", "Cancel transfer"], field=("Amount", "2,500.00", "Transfers over 10,000.00 need a second approver.", "Account number", "12-3", "Enter all 10 digits."), badges=["Pending", "New", "Settled", "Under review", "Returned"], toggles=[("Statement by email", "On the 1st of each month"), ("Two-person approval", "Over 10,000.00"), ("Paper statements", "Mailed quarterly")], faq=[("When do transfers settle?", "Next business day before 3 PM."), ("Are deposits insured?", "Up to the legal limit per depositor."), ("Who can see this account?", "Named signers only.")], tabs=["Summary", "Statements", "Documents"]),
    "care": dict(variants=["Message the clinic", "Reschedule", "Directions", "Cancel visit"], field=("Date of birth", "04/12/1961", "Month, day, year.", "Phone", "555-01", "Enter all ten digits so we can call you."), badges=["Booked", "New result", "Confirmed", "Waiting", "Missed"], toggles=[("Text reminders", "The day before your visit"), ("Large print letters", "For everything we post"), ("Share with family", "Needs your signed consent")], faq=[("How do I get my results?", "Here, usually within two days."), ("Can someone come with me?", "Yes, one person is welcome."), ("Is there parking?", "Free, behind the clinic.")], tabs=["Visits", "Results", "Messages"]),
    "playful": dict(variants=["Favorite", "Share", "Menu", "Remove"], field=("Delivery note", "Ring twice!", "Shown to your rider.", "Promo code", "YUMM", "That code has expired."), badges=["Hot", "New", "Ready", "Baking", "Sold out"], toggles=[("Order updates", "From oven to doorstep"), ("Surprise treat", "A little extra, sometimes"), ("Contact-free", "Leave it at the door")], faq=[("How long does it take?", "About 25 minutes, fresh."), ("Can I tip?", "Yes, 100% goes to the rider."), ("Allergies?", "Each item lists them.")], tabs=["Popular", "Sweet", "Savoury"]),
    "premium": dict(variants=["Suites", "Save", "Our story", "Cancel stay"], field=("Arrival", "Friday 14", "Check-in from 3 PM.", "Guests", "0", "At least one guest."), badges=["Suite", "New", "Confirmed", "Waitlist", "Unavailable"], toggles=[("Turndown service", "Each evening at 8"), ("Airport car", "On arrival"), ("Late check-out", "Subject to availability")], faq=[("Is breakfast included?", "In every suite, served until 11."), ("Can we bring a pet?", "Small dogs, by arrangement."), ("Cancellation?", "Free until 48 hours before.")], tabs=["Rooms", "Dining", "Spa"]),
    "base": dict(variants=["Secondary", "Outline", "Quiet", "Delete"], field=("Email", "name@company.com", "We send the receipt here.", "Phone", "555-01", "Enter all ten digits."), badges=["Draft", "New", "Live", "Waiting", "Failed"], toggles=[("Email alerts", "When a task is assigned to you"), ("Weekly digest", "Every Monday morning"), ("Text messages", "Needs a verified phone")], faq=[("What is included", "Every table, view and page in the template."), ("Who can see it", "Everyone in your organization."), ("Can I undo it", "Yes, from the history of each item.")], tabs=["Overview", "Activity", "Settings"]),
}


def card(s: dict) -> tuple[str, str, str]:
    """The starter's signature card: (name, html, note)."""
    k = s["ui"]["card"]
    head = W + ".c{max-width:400px;padding:var(--space-4);border-radius:var(--radius-lg);border:1px solid var(--divider);background:var(--card);color:var(--card-foreground);box-shadow:var(--shadow-sm)}" \
        ".k{margin:0 0 var(--space-1);font-family:var(--font-label);font-size:var(--text-caption);font-weight:var(--weight-label);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--muted-foreground)}" \
        ".t{margin:0 0 var(--space-1);font-family:var(--font-heading);font-size:var(--text-heading);line-height:var(--leading-heading);font-weight:var(--weight-heading)}" \
        ".m{margin:0 0 var(--space-3);font-size:var(--text-caption);line-height:var(--leading-caption);color:var(--muted-foreground)}"
    b = btn_css(s)
    if k == "generic":
        kk, t, m, a, o = s["copy"].get("card", ("Report", "Quarterly report", "Updated 2 hours ago", "Open", "Share"))
        return ("Card", f"<style>{b}{head}</style><div class=\"w c\"><p class=\"k\">{kk}</p><h3 class=\"t\">{t}</h3><p class=\"m\">{m}</p><div class=\"r\"><button class=\"b p\">{a}</button><button class=\"b o\">{o}</button></div></div>", "One idea per card: a kicker, a title, one line of detail, at most two actions.")
    if k == "metric":
        return ("Metric card", f"<style>{head}.g{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3)}}.n{{margin:0;font-family:var(--font-metric);font-size:var(--text-metric);line-height:var(--leading-metric);font-weight:var(--weight-metric);font-variant-numeric:tabular-nums}}.u{{color:var(--success);font-size:var(--text-caption);font-weight:var(--weight-label)}}.dn{{color:var(--destructive)}}</style>"
                "<div class=\"w g\"><div class=\"c\"><p class=\"k\">Active users</p><p class=\"n\">2,418</p><span class=\"u\">+4.2% vs last week</span></div><div class=\"c\"><p class=\"k\">Churn</p><p class=\"n\">1.9%</p><span class=\"u dn\">+0.3 pts</span></div></div>", "The figure first, then the change, with a word or sign, never color alone.")
    if k == "article":
        return ("Article teaser and pull quote", f"<style>{head}.c{{border:0;border-top:2px solid var(--foreground);border-radius:0;box-shadow:none;background:transparent;padding:var(--space-3) 0 0}}.k{{color:var(--link)}}.s{{margin:0 0 var(--space-2);font-family:var(--font-standfirst);font-size:var(--text-body);line-height:var(--leading-body);color:var(--muted-foreground)}}"
                f".q{{margin:var(--space-6) 0 0;padding:var(--space-4) var(--space-6);background:var(--accent);color:var(--accent-foreground);font-family:var(--font-heading);font-size:var(--text-heading);line-height:var(--leading-heading);font-style:italic}}a{{color:var(--link)}}a:focus-visible{{{FOCUS}}}</style>"
                "<div class=\"w\"><article class=\"c\"><p class=\"k\">Essay</p><h3 class=\"t\"><a href=\"#\">The long afternoon of the letter</a></h3><p class=\"s\">Why we still write to each other by hand, and what we hear when we do.</p><p class=\"m\">By Ottoline Brandt · 14 min read</p></article><blockquote class=\"q\">A letter waits for you. That is its whole kindness.</blockquote></div>", "A teaser leads with its title; a pull quote is one sentence, never two.")
    if k == "ticket":
        return ("Ticket", f"<style>{b}{head}.c{{border:2px solid var(--border);border-radius:0;box-shadow:var(--shadow-md);display:grid;grid-template-columns:1fr auto;gap:var(--space-4);align-items:end}}.t{{text-transform:uppercase;font-family:var(--font-display);font-size:var(--text-heading)}}.k{{color:var(--foreground)}}.x{{background:var(--accent);color:var(--accent-foreground);font-family:var(--font-label);font-weight:var(--weight-label);padding:var(--space-1) var(--space-2);text-transform:uppercase}}</style>"
                "<div class=\"w c\"><div><p class=\"k\">Fri 21 Nov · Doors 8 PM</p><h3 class=\"t\">Night Shift Live</h3><p class=\"m\">The Gantry, Detroit</p><span class=\"x\">Few left</span></div><button class=\"b p\">Get tickets</button></div>", "One event, one big name, one action. Stickers say what is urgent.")
    if k == "chips":
        return ("Chip picker", f"<style>{W}.l{{display:flex;flex-wrap:wrap;gap:var(--space-2)}}.x{{font-family:var(--font-label);font-size:var(--text-label);font-weight:var(--weight-label);min-height:var(--control-height);padding:0 var(--space-4);border-radius:var(--radius-full);border:1px solid var(--border);background:var(--card);color:var(--foreground);cursor:pointer;transition:background-color var(--motion-base)}}"
                f".x[aria-pressed=true]{{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}}.x:focus-visible{{{FOCUS}}}.x:hover{{background:var(--secondary);color:var(--secondary-foreground)}}</style>"
                "<div class=\"w l\" role=\"group\" aria-label=\"Flowers\"><button class=\"x\" aria-pressed=\"true\">Peonies</button><button class=\"x\" aria-pressed=\"false\">Tulips</button><button class=\"x\" aria-pressed=\"true\">Ranunculus</button><button class=\"x\" aria-pressed=\"false\">Sweet pea</button></div>", "Chips choose several things at once; each says whether it is on.")
    if k == "code":
        return ("Code and keys", f"<style>{W}.c{{margin:0 0 var(--space-2);font-family:var(--font-code-block);font-size:var(--text-code-block);line-height:var(--leading-code-block);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);background:var(--muted);color:var(--foreground);border:1px solid var(--divider);white-space:pre-wrap}}.c b{{color:var(--success);font-weight:var(--weight-code)}}"
                ".k{font-family:var(--font-code);font-size:var(--text-caption);padding:0 var(--space-1);border-radius:var(--radius-sm);border:1px solid var(--border);border-bottom-width:2px;background:var(--card);color:var(--muted-foreground)}</style>"
                "<div class=\"w\"><pre class=\"c\"><b>$</b> pipeline run nightly-etl --env prod\n✓ 14 steps · 2m 18s</pre>Command palette: <span class=\"k\">⌘</span> <span class=\"k\">K</span></div>", "Mono for anything a person copies or types: commands, ids, keys.")
    if k == "statement":
        return ("Statement rows", f"<style>{head}.c{{padding:0}}table{{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}}th,td{{padding:var(--space-2) var(--space-4);text-align:left;border-bottom:1px solid var(--divider)}}th{{font-family:var(--font-label);font-size:var(--text-caption);font-weight:var(--weight-label);color:var(--muted-foreground)}}td.n,th.n{{text-align:right;font-family:var(--font-figure);font-weight:var(--weight-figure)}}tr:last-child td{{border-bottom:0}}.neg{{color:var(--destructive)}}</style>"
                "<div class=\"w c\"><table><thead><tr><th>Date</th><th>Description</th><th class=\"n\">Amount</th></tr></thead><tbody><tr><td>Oct 02</td><td>Trust distribution</td><td class=\"n\">2,500.00</td></tr><tr><td>Oct 05</td><td>Filing fee</td><td class=\"n neg\">−185.00</td></tr><tr><td>Oct 09</td><td>Interest</td><td class=\"n\">12.48</td></tr></tbody></table></div>", "Figures in tabular numerals, right aligned; a minus sign as well as color.")
    if k == "appointment":
        return ("Appointment card", f"<style>{b}{head}.c{{display:grid;gap:var(--space-2)}}.d{{display:flex;gap:var(--space-3);align-items:center;font-size:var(--text-body)}}.dt{{min-width:var(--control-height);min-height:var(--control-height);display:grid;place-items:center;border-radius:var(--radius-md);background:var(--accent);color:var(--accent-foreground);font-family:var(--font-label);font-weight:var(--weight-label);font-size:var(--text-label)}}</style>"
                "<div class=\"w c\"><p class=\"k\">Your next visit</p><div class=\"d\"><span class=\"dt\">Tue<br>14</span><div><h3 class=\"t\">Dr. Okafor, family medicine</h3><p class=\"m\">10:30 AM · Room 3 · Bring your medication list</p></div></div><div class=\"r\"><button class=\"b p\">Check in</button><button class=\"b o\">Reschedule</button></div></div>", "Who, when, where and what to bring, in plain words; two large buttons.")
    if k == "product":
        return ("Product card", f"<style>{b}{head}.c{{border:2px solid var(--divider);box-shadow:var(--shadow-md);display:grid;gap:var(--space-2)}}.ph{{height:calc(var(--space-8) * 3);border-radius:var(--radius-md);background:var(--secondary)}}.pr{{display:flex;justify-content:space-between;align-items:center}}.p2{{font-family:var(--font-heading);font-size:var(--text-heading);font-weight:var(--weight-heading)}}.st{{color:var(--warning);font-size:var(--text-caption);font-weight:var(--weight-label)}}"
                ".b:hover{transform:scale(1.04)}.b{transition:transform var(--motion-base)}</style>"
                "<div class=\"w c\"><div class=\"ph\" role=\"img\" aria-label=\"Cinnamon bun\"></div><h3 class=\"t\">Cinnamon bun</h3><span class=\"st\">★ 4.9 · 312 ratings</span><div class=\"pr\"><span class=\"p2\">$3.50</span><button class=\"b p\">Add to bag</button></div></div>", "A picture, a name, a price and one big add button. Ratings with a number.")
    if k == "booking":
        return ("Booking card", f"<style>{b}{head}.c{{border:0;border-top:1px solid var(--accent);border-radius:0;box-shadow:var(--shadow-lg);padding:var(--space-6)}}.t{{font-family:var(--font-display);font-size:var(--text-title);line-height:var(--leading-title);font-weight:var(--weight-display)}}.k{{color:var(--link)}}.b{{width:100%}}</style>"
                "<div class=\"w c\"><p class=\"k\">The Garden Suite</p><h3 class=\"t\">Three nights in October</h3><p class=\"m\">Fri 14 – Mon 17 · Two guests · Breakfast in the courtyard</p><button class=\"b p\">Reserve</button></div>", "One offer, set like a page from a menu, with a single action.")
    raise ValueError(k)


def samples(s: dict) -> list[tuple[str, str, str, str]]:
    c = COPY[s["slug"]]
    b = btn_css(s)
    out: list[tuple[str, str, str, str]] = []
    save = s["copy"]["save"]
    out.append(("Button", "Actions",
                f"<style>{b}</style><div class=\"w r\"><button class=\"b p\">{save}</button><button class=\"b p h\">Hover</button><button class=\"b p f\">Focus</button><button class=\"b p\" disabled>Disabled</button></div>",
                "The one main action of a screen. Never two side by side."))
    v = c["variants"]
    out.append(("Button variants", "Actions",
                f"<style>{b}</style><div class=\"w r\"><button class=\"b s\">{v[0]}</button><button class=\"b o\">{v[1]}</button><button class=\"b q\">{v[2]}</button><button class=\"b d\">{v[3]}</button></div>",
                "Secondary, outline and quiet for everything else; danger only for what cannot be undone."))
    f = c["field"]
    out.append(("Text field", "Inputs",
                f"<style>{W}.g{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-4)}}.f{{display:grid;gap:var(--space-1);max-width:340px}}.l{{font-family:var(--font-label);font-size:var(--text-label);font-weight:var(--weight-label);color:var(--foreground)}}"
                f".i{{font-family:var(--font-body);font-size:var(--text-body);min-height:var(--control-height);padding:0 var(--space-3);border-radius:var(--radius-md);border:{s['ui']['bw']} solid var(--input);background:var(--card);color:var(--foreground);transition:box-shadow var(--motion-fast)}}"
                f".i:focus-visible,.i.f{{border-color:var(--ring);{FOCUS}}}.h{{font-size:var(--text-caption);line-height:var(--leading-caption);color:var(--muted-foreground)}}.i[aria-invalid=true]{{border-color:var(--destructive)}}.e{{color:var(--destructive)}}</style>"
                f"<div class=\"w g\"><label class=\"f\"><span class=\"l\">{f[0]}</span><input class=\"i f\" value=\"{f[1]}\" aria-describedby=\"h1\"><span class=\"h\" id=\"h1\">{f[2]}</span></label>"
                f"<label class=\"f\"><span class=\"l\">{f[3]}</span><input class=\"i\" value=\"{f[4]}\" aria-invalid=\"true\" aria-describedby=\"h2\"><span class=\"h e\" id=\"h2\">{f[5]}</span></label></div>",
                "A visible label above, a hint or the error below; the error names the fix."))
    out.append((*card(s)[:1], "Containers", *card(s)[1:]))
    bd = c["badges"]
    out.append(("Badge", "Status",
                f"<style>{W}.r{{display:flex;flex-wrap:wrap;gap:var(--space-2)}}.x{{display:inline-flex;align-items:center;gap:var(--space-1);padding:var(--space-1) var(--space-2);border-radius:{'var(--radius-full)' if s['ui']['btn_r'].endswith('full)') else 'var(--radius-sm)'};font-family:var(--font-label);font-size:{'var(--text-label)' if s['ui'].get('big') else 'var(--text-caption)'};font-weight:var(--weight-label);letter-spacing:var(--tracking-label);text-transform:{s['ui']['case']};border:1px solid var(--divider);color:var(--foreground);background:var(--muted)}}"
                ".x i{width:.5em;height:.5em;border-radius:50%;background:currentColor}.ok{color:var(--success)}.wa{color:var(--warning)}.er{color:var(--destructive)}.pr{background:var(--accent);color:var(--accent-foreground);border-color:transparent}</style>"
                f"<div class=\"w r\"><span class=\"x\">{bd[0]}</span><span class=\"x pr\">{bd[1]}</span><span class=\"x ok\"><i></i>{bd[2]}</span><span class=\"x wa\"><i></i>{bd[3]}</span><span class=\"x er\"><i></i>{bd[4]}</span></div>",
                "A status always pairs its color with a word."))
    tg = c["toggles"]
    out.append(("Toggle list", "Selection",
                f"<style>{W}.l{{display:grid;max-width:460px;border:1px solid var(--divider);border-radius:var(--radius-lg);background:var(--card)}}.o{{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);min-height:var(--control-height);padding:var(--space-2) var(--space-4);color:var(--card-foreground);cursor:pointer}}.o+.o{{border-top:1px solid var(--divider)}}"
                ".o small{display:block;font-size:var(--text-caption);line-height:var(--leading-caption);color:var(--muted-foreground)}.t{appearance:none;flex:none;width:calc(var(--space-6) + var(--space-4));height:var(--space-6);border-radius:var(--radius-full);background:var(--input);position:relative;cursor:pointer;margin:0;transition:background-color var(--motion-fast)}"
                ".t::after{content:\"\";position:absolute;top:3px;left:3px;width:calc(var(--space-6) - 6px);height:calc(var(--space-6) - 6px);border-radius:50%;background:var(--card);transition:transform var(--motion-base)}.t:checked{background:var(--primary)}.t:checked::after{transform:translateX(var(--space-4))}"
                f".t:focus-visible{{{FOCUS}}}.t:disabled{{opacity:var(--opacity-disabled);cursor:not-allowed}}.o:has(.t:disabled){{color:var(--muted-foreground);cursor:not-allowed}}</style>"
                f"<div class=\"w l\"><label class=\"o\"><span>{tg[0][0]}<small>{tg[0][1]}</small></span><input type=\"checkbox\" role=\"switch\" class=\"t\" checked></label>"
                f"<label class=\"o\"><span>{tg[1][0]}<small>{tg[1][1]}</small></span><input type=\"checkbox\" role=\"switch\" class=\"t\"></label>"
                f"<label class=\"o\"><span>{tg[2][0]}<small>{tg[2][1]} (unavailable)</small></span><input type=\"checkbox\" role=\"switch\" class=\"t\" disabled></label></div>",
                "A switch acts at once. When a choice needs a Save, use a checkbox."))
    fq = c["faq"]
    out.append(("Collapsible list", "Disclosure",
                f"<style>{W}.d{{max-width:520px;border:1px solid var(--divider);border-radius:var(--radius-lg);background:var(--card);color:var(--card-foreground)}}details+details{{border-top:1px solid var(--divider)}}"
                f"summary{{list-style:none;cursor:pointer;min-height:var(--control-height);padding:var(--space-2) var(--space-4);font-family:var(--font-label);font-size:var(--text-label);font-weight:var(--weight-label);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)}}summary:focus-visible{{{FOCUS}}}summary::-webkit-details-marker{{display:none}}summary::after{{content:\"+\";color:var(--muted-foreground)}}details[open] summary::after{{content:\"\\2212\"}}"
                "p{margin:0;padding:0 var(--space-4) var(--space-3);font-size:var(--text-body);line-height:var(--leading-body);color:var(--muted-foreground)}</style>"
                "<div class=\"w d\">" + "".join(f"<details{' open' if i == 0 else ''}><summary>{q}</summary><p>{a}</p></details>" for i, (q, a) in enumerate(fq)) + "</div>",
                "For answers people look up once. Never hide a step people must take."))
    out.append(("Tabs", "Disclosure", tabs(s, c["tabs"]), "Tabs switch views of one thing. Three to five short names."))
    if s["ui"].get("catalogue"):
        out.append(("Select and search", "Inputs",
                    f"<style>{W}.g{{display:flex;flex-wrap:wrap;gap:var(--space-3)}}.i{{font-family:var(--font-body);font-size:var(--text-body);min-height:var(--control-height);padding:0 var(--space-3);min-width:200px;border-radius:var(--radius-md);border:1px solid var(--input);background:var(--card);color:var(--foreground)}}.i:focus-visible{{border-color:var(--ring);{FOCUS}}}</style>"
                    "<div class=\"w g\"><select class=\"i\" aria-label=\"Repeat\"><option>Weekly</option><option>Monthly</option></select><input class=\"i\" type=\"search\" placeholder=\"Search people\" aria-label=\"Search people\"></div>",
                    "A select for a short fixed list; a search box when the list is long."))
        out.append(("Checkbox and radio", "Selection",
                    f"<style>{W}.g{{display:flex;flex-wrap:wrap;gap:var(--space-6)}}.c{{display:grid;gap:var(--space-2)}}label{{display:flex;align-items:center;gap:var(--space-2);cursor:pointer}}input{{accent-color:var(--primary);width:var(--space-4);height:var(--space-4);margin:0}}input:focus-visible{{{FOCUS}}}</style>"
                    "<div class=\"w g\"><div class=\"c\" role=\"group\" aria-label=\"Send\"><label><input type=\"checkbox\" checked>Invoices</label><label><input type=\"checkbox\">Receipts</label></div><div class=\"c\" role=\"radiogroup\" aria-label=\"Billing\"><label><input type=\"radio\" name=\"p\" checked>Monthly</label><label><input type=\"radio\" name=\"p\">Yearly</label></div></div>",
                    "Checkboxes for several choices; radios for exactly one."))
    return out


def hero(s: dict) -> str:
    h = s["hero"]
    g = h["graphic"]
    shapes = {
        "blocks": ".a{inset:0 22% 22% 0;background:var(--primary);border-radius:var(--radius-lg)}.b{inset:22% 0 0 22%;background:var(--muted);border:1px solid var(--divider);border-radius:var(--radius-lg)}.d{inset:44% 12% 12% 44%;background:var(--card);border:1px solid var(--divider);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg)}.e{width:22%;height:22%;right:20%;bottom:20%;border-radius:50%;background:var(--accent)}",
        "panels": ".a{inset:0 30% 40% 0;background:var(--card);border:1px solid var(--divider);border-radius:var(--radius-lg);box-shadow:var(--shadow-md)}.b{inset:30% 0 10% 20%;background:var(--card);border:1px solid var(--divider);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg)}.d{left:28%;right:12%;bottom:22%;height:12%;background:var(--primary);border-radius:var(--radius-sm)}.e{left:28%;width:30%;bottom:38%;height:8%;background:var(--accent);border-radius:var(--radius-sm)}",
        "columns": ".a{inset:0 66% 0 0;border-top:3px solid var(--foreground);background:var(--muted)}.b{inset:0 33% 0 34%;border-top:3px solid var(--foreground);background:var(--muted)}.d{inset:0 0 0 67%;border-top:3px solid var(--primary);background:var(--accent)}.e{left:4%;right:70%;top:20%;height:4%;background:var(--foreground)}",
        "stack": ".a{inset:0 18% 18% 0;background:var(--primary);border:2px solid var(--border);box-shadow:var(--shadow-lg)}.b{inset:30% 0 0 30%;background:var(--accent);border:2px solid var(--border);box-shadow:var(--shadow-md)}.d{inset:56% 30% 10% 50%;background:var(--background);border:2px solid var(--border)}.e{width:0;height:0}",
        "pebbles": ".a{inset:0 30% 30% 0;background:var(--primary);border-radius:var(--radius-full)}.b{inset:35% 0 0 35%;background:var(--secondary);border-radius:var(--radius-full)}.d{inset:55% 45% 5% 15%;background:var(--accent);border-radius:var(--radius-full)}.e{width:16%;height:16%;right:6%;top:6%;border-radius:var(--radius-full);background:var(--muted)}",
        "terminal": ".a{inset:0;background:var(--card);border:1px solid var(--divider);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg)}.b{left:8%;top:14%;width:50%;height:6%;background:var(--success);border-radius:var(--radius-sm)}.d{left:8%;top:30%;width:72%;height:6%;background:var(--muted-foreground);opacity:.5;border-radius:var(--radius-sm)}.e{left:8%;top:46%;width:8%;height:8%;background:var(--primary)}",
        "ledger": ".a{inset:0;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm)}.b{left:10%;right:10%;top:18%;height:2px;background:var(--divider)}.d{left:10%;right:10%;top:40%;height:2px;background:var(--divider)}.e{right:10%;width:30%;top:58%;height:18%;background:var(--primary);border-radius:var(--radius-sm)}",
        "circles": ".a{inset:5% 25% 25% 5%;background:var(--secondary);border-radius:50%}.b{inset:30% 5% 5% 30%;background:var(--accent);border-radius:50%}.d{inset:38% 38% 38% 38%;background:var(--primary);border-radius:50%}.e{width:0;height:0}",
        "confetti": ".a{inset:0 25% 25% 0;background:var(--primary);border-radius:var(--radius-lg);transform:rotate(-6deg);box-shadow:var(--shadow-md)}.b{inset:28% 0 0 28%;background:var(--secondary);border-radius:var(--radius-full)}.d{inset:6% 6% 62% 62%;background:var(--accent);border-radius:50%}.e{width:18%;height:18%;left:8%;bottom:6%;background:var(--link);border-radius:var(--radius-sm);transform:rotate(18deg)}",
        "frame": ".a{inset:0;border:1px solid var(--accent)}.b{inset:8%;background:var(--muted)}.d{left:20%;right:20%;top:48%;height:1px;background:var(--accent)}.e{width:0;height:0}",
    }[g]
    chips = "".join(f"<span>{x}</span>" for x in h["chips"])
    return (
        "<style>.h{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:var(--space-8);align-items:center;padding:var(--space-2) 0;font-family:var(--font-body);color:var(--foreground)}@media (max-width:640px){.h{grid-template-columns:1fr}.g{display:none}}"
        f".k{{margin:0 0 var(--space-3);font-family:var(--font-label);font-size:var(--text-label);font-weight:var(--weight-label);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--link)}}"
        ".x{margin:0;font-family:var(--font-display);font-size:var(--text-display);line-height:var(--leading-display);font-weight:var(--weight-display);letter-spacing:var(--tracking-display);color:var(--foreground)}"
        ".t{margin:var(--space-4) 0 0;max-width:32ch;font-size:var(--text-body);line-height:var(--leading-body);color:var(--muted-foreground)}"
        f".c{{display:flex;gap:var(--space-2);margin-top:var(--space-6);flex-wrap:wrap}}.c span{{font-family:var(--font-label);font-size:var(--text-caption);font-weight:var(--weight-label);padding:var(--space-1) var(--space-3);border-radius:{'var(--radius-full)' if s['ui']['btn_r'].endswith('full)') else 'var(--radius-sm)'};border:1px solid var(--border);color:var(--foreground)}}"
        ".g{position:relative;aspect-ratio:1/1;max-width:300px;justify-self:end;width:100%}.g i{position:absolute;display:block}" + shapes + "</style>"
        f"<div class=\"h\"><div><p class=\"k\">{h['kicker']}</p><h1 class=\"x\">{h['head']}</h1><p class=\"t\">{h['tag']}</p><div class=\"c\">{chips}</div></div>"
        "<div class=\"g\" aria-hidden=\"true\"><i class=\"a\"></i><i class=\"b\"></i><i class=\"d\"></i><i class=\"e\"></i></div></div>"
    )


# ── Pack assembly ─────────────────────────────────────────────────────────────────────────────────

FIELD = {"sensitivity": "internal", "contextPolicy": "include"}
COLOR_GROUPS = {"Surfaces": "slate", "Muted": "gray", "Primary": "blue", "Secondary": "violet", "Accent": "amber", "Lines": "teal", "Feedback": "red"}
SPACE_NOTES = ["Between an icon and its label.", "Between related controls in a row.", "Inside a compact card; between a label and its field.", "Padding of a card or a dialog.", "Between groups inside a section.", "Between sections of a page.", "The height of buttons, fields and rows people press."]
RADIUS_NOTES = ["Tags, checkboxes and small chips.", "Buttons, fields and menus (also --radius).", "Cards, dialogs and panels.", "Avatars, pills and switches."]
SHADOW_NOTES = ["Cards resting on the page.", "Menus and popovers over content.", "Dialogs, the highest layer on screen."]
OPACITY_NOTES = ["A control that cannot be used yet.", "The tint laid over a row or a button on hover.", "The dim behind a dialog."]
MOTION_NOTES = ["Hover, press and focus.", "Menus, popovers and things arriving.", "Dialogs, side panels and page changes."]


def f(key, label, ptype, **extra):
    return {"key": key, "label": label, "parityType": ptype, **FIELD, **extra}


def table(token, name, single, plural, icon, describes, fields, rows):
    return {"token": token, "name": name, "labelSingular": single, "labelPlural": plural, "type": "entity", "display": "grid", "weight": "light", "ordered": True, "icon": icon, "titleField": "name", "describes": describes, "subject": "thing", "fields": fields, "rows": rows}


def jd(v):
    return json.dumps(v, separators=(",", ":"))


def layers(ls):
    out = [{"x": x, "y": y, "blur": b, "spread": sp, "color": c} for (x, y, b, sp, c) in ls]
    return out[0] if len(out) == 1 else {"layers": out}


def dark_shadows(s):
    if "dark_shadows" in s:
        return s["dark_shadows"]
    a = s.get("dark_alpha", "80")
    return [[(x, y, b, sp, "#000000" + a) for (x, y, b, sp, _c) in ls] + [RING_DARK] for ls in s["shadows"]]


def rows_with_extras(core_values, extras, names, notes):
    """Core rows (fixed names) then extras (name, value, note)."""
    out = [(n, v, notes[i]) for i, (n, v) in enumerate(zip(names, core_values))]
    return out + [tuple(e) for e in extras]


def contrast_rows(s):
    c = s["colors"]
    pairs = []
    for name, group, on, _n in COLOR_ROLES:
        if on:
            pairs.append((name, on, 3.0 if name in LINES else 4.5, "reads_on"))
        for g, need in ALSO.get(name, []):
            pairs.append((name, g, need, "also"))
    return [(i, g, k, ratio(c[i][0], c[g][0]), ratio(c[i][1], c[g][1]), need) for i, g, need, k in pairs]


def design_profile(s):
    p = dict(s["profile"])
    fonts = []
    for n, _g, fo, *_ in s["type"]:
        fam = fo.split(",")[0].strip().strip("'")
        if fam in [x["family"] for x in fonts]:
            continue
        source = "system" if fam in ("system-ui", "ui-monospace") else "google"
        fonts.append({"family": fam, "role": n, "source": source})
    p["fonts"] = fonts
    p["primary"] = {"light": s["colors"]["primary"][0], "dark": s["colors"]["primary"][1]}
    return p


def cover_text(s):
    lines = ["## Principles", ""] + [f"- {x}" for x in s["principles"]]
    if not s.get("base"):
        p = s["profile"]
        lines += ["", "## Starter profile", "",
                  f"- **Fits:** {', '.join(p['industries'])}." + (f" Not for {', '.join(p['avoidFor'])}." if p["avoidFor"] else ""),
                  f"- **Mood:** {', '.join(p['mood'])}; density {p['density']}; shape {p['shape']}; contrast {p['contrast']}; {p['defaultTheme']} first.",
                  f"- **Type:** {', '.join(dict.fromkeys(fo.split(',')[0].strip().strip(chr(39)) for _n, _g, fo, *_ in s['type']))}.",
                  f"- **Adapt first:** {', '.join(p['adaptFirst'])}. **Keep:** {', '.join(p['lockedTokens']) or 'nothing fixed'}."]
    lines += ["", "## Using tokens", "",
              "Use a token by its name, never its value. Change a value here and every screen and every component sample below follows: colors, type, spacing, corners, shadows, opacity and motion. Each color shows its light and dark values and is checked against the color it is read on.",
              "", "## Using components", "",
              "Build screens from the components in this system. Each one is drawn below in its states, with a note on when to use it. When one is missing, add a row to Components.",
              "", "## Accessibility", "",
              "Text reaches 4.5:1 against what it sits on; control edges and focus 3:1. Focus is always visible. Nothing is told by color alone.", ""]
    return "\n".join(lines)


def build(s, kept=None):
    """kept = the committed pack for this system, if any: its `cover` and `version` are hand-owned (a person
    picks the gallery cover and bumps the version when publishing), so the generator carries them over and
    never resets or bumps them. The constants are only the first-write defaults for a pack with no file yet."""
    base = bool(s.get("base"))
    kept = kept or {}
    version = kept.get("version", BASE_VERSION if base else STARTER_VERSION)
    c = s["colors"]
    notes = s.get("notes", {})
    color_rows = []
    for i, (name, group, on, note) in enumerate(COLOR_ROLES, 1):
        # A Lines color carries its own minimum (3:1, WCAG 1.4.11) in its value, so every checker reads one rule.
        pair = {"light": c[name][0], "dark": c[name][1], **({"min": 3} if group == "Lines" else {})}
        v = {"name": name, "group": group, "value": jd(pair), "usage_note": notes.get(name, note)}
        if on:
            v["reads_on"] = on
        color_rows.append({"key": f"col-{i:02d}", "values": v})
    # The lead colors read first on the Colors table and the gallery card (keys keep their role numbering).
    lead = lead_colors(c)
    color_rows.sort(key=lambda r: lead.index(r["values"]["name"]) if r["values"]["name"] in lead else len(lead))
    groups = list(dict.fromkeys(r[1] for r in COLOR_ROLES))
    type_rows = [{"key": f"typ-{i:02d}", "values": {"name": n, "group": g, "style": jd({"font": fo, "weight": w, "size": sz, "lineHeight": lh, "letterSpacing": ls}), "usage_note": note}} for i, (n, g, fo, w, sz, lh, ls, note) in enumerate(s["type"], 1)]
    tgroups = list(dict.fromkeys(t[1] for t in s["type"]))
    sp = rows_with_extras(s["spacing"][0], s["spacing"][1:], CORE_SPACE, SPACE_NOTES)
    rd = rows_with_extras(list(s["radius"][0]) + [9999], s["radius"][1:], CORE_RADIUS, RADIUS_NOTES)
    dk = dark_shadows(s)
    sh = [(CORE_SHADOW[i], jd({"light": layers(s["shadows"][i]), "dark": layers(dk[i])}), SHADOW_NOTES[i]) for i in range(3)]
    op = rows_with_extras(s["opacity"][:3], s["opacity"][3:], CORE_OPACITY, OPACITY_NOTES)
    mo = [(CORE_MOTION[i], jd({"duration": d, "easing": e}), MOTION_NOTES[i]) for i, (d, e) in enumerate(s["motion"][:3])] + [(n, jd({"duration": d, "easing": e}), note) for (n, d, e, note) in s["motion"][3:]]
    comp = samples(s)
    cgroups = list(dict.fromkeys(x[1] for x in comp))
    cg = {"Actions": "blue", "Inputs": "teal", "Containers": "slate", "Status": "amber", "Selection": "violet", "Disclosure": "gray"}
    tg = {"Display": "violet", "Headings": "blue", "Text": "slate", "Code": "amber"}
    name_f = f("name", "Name", "text", required=True)
    note_f = f("usage_note", "Usage note", "text")

    def simple(prefix, rows):
        return [{"key": f"{prefix}-{i:02d}", "values": {"name": n, "value": v, "usage_note": note}} for i, (n, v, note) in enumerate(rows, 1)]

    tables = [
        table("color", "Colors", "Color", "Colors", "palette", "Every color the product uses, light and dark, and what each is read on.",
              [name_f, f("group", "Group", "select", choices=groups, choiceColors={g: COLOR_GROUPS[g] for g in groups}),
               f("value", "Value", "text", look={"id": "color_pair", "options": {"contrastWith": {"readsOnField": "reads_on"}}}), f("reads_on", "Read on", "text"), note_f], color_rows),
        table("type_style", "Typography", "Text style", "Text styles", "type", "The text styles: font, weight, size, line height and spacing.",
              [name_f, f("group", "Group", "select", choices=tgroups, choiceColors={g: tg[g] for g in tgroups}), f("style", "Style", "text", look={"id": "type_style"}), note_f], type_rows),
        table("spacing", "Spacing", "Spacing value", "Spacing values", "ruler", "The spacing scale every layout is built from, and the height of controls.",
              [name_f, f("value", "Value", "number", rules=[{"kind": "min", "value": 0}, {"kind": "max", "value": 256}], look={"id": "measure", "options": {"unit": "px", "measurePreview": "spacing"}}), note_f], simple("spc", sp)),
        table("radius", "Corner radius", "Radius", "Radii", "square", "How round corners are, from chips to avatars.",
              [name_f, f("value", "Value", "number", rules=[{"kind": "min", "value": 0}, {"kind": "max", "value": 9999}], look={"id": "measure", "options": {"unit": "px", "measurePreview": "radius"}}), note_f], simple("rad", rd)),
        table("shadow", "Shadows", "Shadow", "Shadows", "layers", "Elevation: how far something floats above the page, in light and dark.",
              [name_f, f("value", "Value", "text", look={"id": "shadow"}), note_f], simple("shd", sh)),
        table("component", "Components", "Component", "Components", "component", "Each component family, drawn as it looks in light and dark, with where to use it.",
              [name_f, f("group", "Group", "select", choices=cgroups, choiceColors={g: cg[g] for g in cgroups}), f("sample", "Sample", "text", look={"id": "html_sample"}), note_f],
              [{"key": f"cmp-{i:02d}", "values": {"name": n, "group": g, "sample": html, "usage_note": note}} for i, (n, g, html, note) in enumerate(comp, 1)]),
        table("opacity", "Opacity", "Opacity", "Opacities", "droplet", "How see-through things get: disabled controls, tints and overlays.",
              [name_f, f("value", "Value", "number", rules=[{"kind": "min", "value": 0}, {"kind": "max", "value": 1}], look={"id": "opacity"}), note_f], simple("opa", op)),
        table("motion", "Motion", "Motion", "Motions", "zap", "How fast things move and how they ease in and out.",
              [name_f, f("value", "Value", "text", look={"id": "motion"}), note_f], simple("mot", mo)),
    ]
    views = [{"token": f"all_{t}", "name": n, "table": t, "kind": "grid", "isDefault": True} for t, n in [("color", "All colors"), ("type_style", "All text styles"), ("spacing", "All spacing values"), ("radius", "All radii"), ("shadow", "All shadows"), ("component", "All components"), ("opacity", "All opacities"), ("motion", "All motions")]]
    surfaces = sum(1 for r in COLOR_ROLES if r[1] == "Surfaces")
    st = s["studio"]
    title = s.get("title", f"Design system — {s['name']}")

    def sec(t, token, h):
        return {"title": t, "tiles": [{"kind": "table", "title": t, "table": token, "layout": "section", "size": {"w": 1020, "h": h}}]}

    board = {
        "key": "design-system" if base else f"design-system-{s['slug']}",
        "title": "Design system" if base else title,
        "layout": "page",
        "chapters": [
            {"title": "Overview", "tiles": [{"kind": "cover", "title": "Design system" if base else title, "hero": hero(s), "text": cover_text(s), "size": {"w": 1020, "h": 1000 if not base else 900}}]},
            sec("Colors", "color", 120 + 80 * len(color_rows)), sec("Typography", "type_style", 160 + 100 * len(type_rows)),
            sec("Spacing", "spacing", 160 + 64 * len(sp)), sec("Corner radius", "radius", 200 + 64 * len(rd)), sec("Shadows", "shadow", 220 + 70 * len(sh)),
            sec("Opacity", "opacity", 160 + 64 * len(op)), sec("Motion", "motion", 160 + 64 * len(mo)), sec("Components", "component", 200 + 150 * len(comp)),
            {"title": "Assets", "tiles": [{"kind": "note", "title": "Assets", "text": "Keep the logo files, icon set and brand photography here, or on the Files page. Name each file for what it is and where it is used.\n", "size": {"w": 1020, "h": 280}}]},
        ],
        "pages": [{"key": "files", "title": "Files", "layout": "page", "chapters": [{"title": "Files", "tiles": [{"kind": "writeUp", "title": "Files", "text": "Drop logo files, icon sets and exports on this page. Each file becomes a tile you can open and share.", "size": {"w": 1020, "h": 200}}]}]}],
    }
    person = s.get("person", "Ilse Marchetti")
    first = person.split()[0]
    spec = {
        "specVersion": 1,
        "id": "spaces-design-system-board" if base else f"spaces-design-starter-{s['slug']}",
        "catalogueId": s["id"],
        "useCase": s.get("useCase") or f"{person} starts {st[0]}'s design system from the {s['name']} starter and adapts it to the brand.",
        "industry": "cross_industry", "vertical": s["vertical"], "job": "content", "audience": "organization", "teaches": "tables", "strengths": [], "requires": [],
        "business": {"name": st[0], "describes": st[1], "address": {"line1": s.get("line1") or f"{(int(s['id'][2:]) % 90) + 10} {st[3]}", "city": st[4], "region": st[5], "postalCode": st[6], "country": "US"}, "phone": st[7], "website": st[2], "email": f"hello@{st[2]}", "timezone": st[8]},
        "cleanupTag": "use-case:spaces-design-system-board" if base else f"use-case:spaces-design-starter-{s['slug']}",
        "tables": tables, "relationships": [], "sharedBlocks": [],
        "forms": [{"token": "color_request", "name": "Propose a color", "describes": "Suggest a new color for the system.", "audience": "staff", "table": "color",
                   "fields": [{"fieldKey": "name", "ask": "What is the color called?", "required": True}, {"fieldKey": "group", "ask": "Which group does it belong to?"}, {"fieldKey": "usage_note", "ask": "Where would it be used?"}],
                   "submitLabel": "Send proposal", "confirmation": "Thanks. It is in the Colors section."}],
        "dimensions": [], "extras": [], "views": views,
        "agent": {"platformAgent": {"id": "4cd676c6-f55d-4426-b7eb-a9d0273566ec", "name": "Answers From Your Tables"}, "name": "Design system assistant",
                  "variables": [{"name": "primary_table", "table": "color", "describes": "Every color, its light and dark values and what it is read on."}, {"name": "related_tables", "table": "type_style", "describes": "The text styles."}],
                  "question": {"ask": "How many colors are in the Surfaces group?", "whyItMatters": s.get("why") or f"{first} keeps the surfaces to a handful so screens stay calm.",
                               "expect": {"table": "color", "measure": {"op": "count"}, "filter": {"group": "Surfaces"}, "answer": surfaces, "unit": "colors"}}},
        "walk": [{"says": "Open Colors.", "action": {"kind": "open", "surface": "all_color"}, "expect": {"kind": "renders", "surface": "all_color", "minItems": 3}},
                 {"says": "Open Typography.", "action": {"kind": "open", "surface": "all_type_style"}, "expect": {"kind": "renders", "surface": "all_type_style", "minItems": 3}},
                 {"says": "Open Components.", "action": {"kind": "open", "surface": "all_component"}, "expect": {"kind": "renders", "surface": "all_component", "minItems": 3}}],
        "foundation": [],
        "provenance": {"kind": "synthesized", "authoredBy": "Board template author (Claude)", "authoredOn": TODAY, "noRealPeople": True, "sources": [], "fictionalDomains": [st[2]], "fictionalStreets": [st[3]]},
        "version": version,
    }
    pack = {"packVersion": 1, "catalogueId": s["id"], "version": version, "title": title, "description": s["description"], "forWho": s["forWho"],
            "icon": {"icon": "Palette"}, "cover": kept.get("cover"), "category": "docs", "tags": s["tags"], "designProfile": design_profile(s), "spec": spec, "pages": [], "board": board}
    if s.get("waive_radius"):
        rad = next(i for i, t in enumerate(tables) if t["token"] == "radius")
        pack["waivers"] = [{"at": f"spec.tables[{rad}] (radius).rows[{j}] (rad-{j + 1:02d})", "because": "A square system: every corner is 0 on purpose; the rows differ by where they are used."} for j in (1, 2)]
    return pack


def main():
    check_only = "--check" in sys.argv
    out_dir = PACKS
    if "--out" in sys.argv:
        out_dir = Path(sys.argv[sys.argv.index("--out") + 1]).resolve()
        out_dir.mkdir(parents=True, exist_ok=True)
    bad = 0
    print("| Pack | Ink | Ground | Kind | Light | Dark | Needs |\n|---|---|---|---|---|---|---|")
    for s in ALL:
        assert set(s["colors"]) == {r[0] for r in COLOR_ROLES}, (s["slug"], set(s["colors"]) ^ {r[0] for r in COLOR_ROLES})
        names = [t[0] for t in s["type"]]
        assert names[: len(CORE_TYPE)] == CORE_TYPE, (s["slug"], names)
        for ink, ground, kind, lr, dr, need in contrast_rows(s):
            flag = "" if lr >= need and dr >= need else " FAIL"
            bad += bool(flag)
            print(f"| {s['name'] if not s.get('base') else 'Base (SP0363)'} | {ink} | {ground} | {kind} | {lr} | {dr} | {need}{flag} |")
    if bad:
        print(f"\n{bad} pair(s) below their bar; nothing written.", file=sys.stderr)
        return 1
    if check_only:
        return 0
    # The base board (SP0363) is written only with --with-base: its owner lands its Cover by hand.
    for s in ALL if "--with-base" in sys.argv else STARTERS:
        name = s.get("file") or f"design-starter-{s['slug']}.pack.json"
        kept_file = PACKS / name
        kept = json.loads(kept_file.read_text()) if kept_file.exists() else None
        p = out_dir / name
        p.write_text(json.dumps(build(s, kept), indent=2, ensure_ascii=False) + "\n")
        print("wrote", p.name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
