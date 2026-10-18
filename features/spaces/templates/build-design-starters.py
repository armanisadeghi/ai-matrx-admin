#!/usr/bin/env python3
"""features/spaces/templates/build-design-starters.py — THE TEN DESIGN SYSTEM STARTERS (SP0490–SP0499)

One readable table of values per starter, emitted as board packs with the same structure as the
Design system board (SP0363): Overview, Colors, Typography, Spacing, Corner radius, Shadows,
Opacity, Motion, Components, Assets, and a Files page. A person never starts a design system blank;
an agent picks the starter nearest a brand (the `profile` of each starter is written into the pack's
tags, description, forWho, spec.vertical/useCase and the Overview's "Starter profile") and adapts it.

Clean-room: our own words and values. Fonts are system fonts or Google fonts, always named first and
followed by system fallbacks and a generic family, so the stack degrades well where they are not
installed.

Run:   python3 features/spaces/templates/build-design-starters.py          # writes packs/design-starter-*.pack.json
       python3 features/spaces/templates/build-design-starters.py --check  # contrast table only, no writes
Every text colour reaches 4.5:1 on its ground in light AND dark (the script refuses to write otherwise;
`pnpm spaces:templates:check` enforces the same for every design pack's `reads_on`).
Then: pnpm spaces:templates:check features/spaces/templates/packs/design-starter-*.pack.json
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PACKS = HERE / "packs"
VERSION = 1
TODAY = "2026-10-17"

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


# ── The colour roles. Each: (name, group, reads_on or None, usage note). Values come per starter. ──
# The names are the CSS variables the component samples draw with (html_sample's token list).

ROLES = [
    ("background", "Surfaces", None, "The page itself. Everything else sits on it."),
    ("foreground", "Surfaces", "background", "Body text and icons on the page."),
    ("card", "Surfaces", None, "Raised panels, dialogs and menus."),
    ("card-foreground", "Surfaces", "card", "Text inside a card."),
    ("popover", "Surfaces", None, "Menus, tooltips and pickers that float over content."),
    ("popover-foreground", "Surfaces", "popover", "Text inside a menu or tooltip."),
    ("muted", "Muted", None, "Quiet fills: table headers, empty states, code blocks."),
    ("muted-foreground", "Muted", "muted", "Hints and captions. Also reads on the page and on cards."),
    ("primary", "Primary", None, "The one main action on a screen."),
    ("primary-foreground", "Primary", "primary", "Label on a primary button."),
    ("secondary", "Secondary", None, "Second actions and quiet selected states."),
    ("secondary-foreground", "Secondary", "secondary", "Label on a secondary button."),
    ("accent", "Accent", None, "Highlights: a selected row, a tip, a new feature."),
    ("accent-foreground", "Accent", "accent", "Text on an accent fill."),
    ("border", "Lines", None, "Dividers and card edges. Never text."),
    ("input", "Lines", None, "The outline of a field and an off switch, so they are found without a label."),
    ("ring", "Lines", None, "Keyboard focus. Always visible, never removed."),
    ("destructive", "Feedback", "muted", "Errors and delete. Also reads on the page and on cards."),
    ("destructive-foreground", "Feedback", "destructive", "Label on a delete button."),
    ("success", "Feedback", "muted", "Done, live, saved. Never the only sign: pair it with a word."),
    ("warning", "Feedback", "muted", "Waiting or at risk. Never the only sign: pair it with a word."),
]
# Near blank keeps the floor: no popover or accent (menus use card; highlights use muted).
FLOOR_SKIP = {"popover", "popover-foreground", "accent", "accent-foreground"}

# Text that sits on more than its named ground in the samples: checked here too (4.5:1).
ALSO_TEXT_ON = {
    "muted-foreground": ["background", "card"],
    "destructive": ["background", "card"],
    "success": ["background", "card"],
    "warning": ["background", "card"],
    "foreground": ["muted", "card"],
}
# Non-text parts (control outlines, focus, button edges) reach 3:1 on the page (WCAG 1.4.11).
NON_TEXT_ON = {"input": ["background", "card"], "ring": ["background"]}

# ── The ten starters ──────────────────────────────────────────────────────────────────────────────
# colors: name → (light, dark). type: (name, group, font, weight, size, lineHeight, letterSpacing em, note).
# shadows: (name, light layers, dark layers, note) with layers [(x, y, blur, spread, hex8)].
# ui: how the component samples are drawn (font stacks, control height, label case, border width).

SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"

STARTERS: list[dict] = [
    {
        "slug": "near-blank",
        "id": "SP0490",
        "name": "Near blank",
        "description": "The floor: neutral greys, one blue accent and the fewest rows. A clean start.",
        "forWho": "Anyone starting a design system from almost nothing",
        "tags": ["design system", "starter", "minimal", "neutral", "any industry", "blank"],
        "vertical": "Design systems — any brand",
        "person": "Noor Haddad",
        "studio": ("Plainfield Works", "A two-person app studio that wants a clean starting point.", "plainfieldworks.net", "Hollis Lane", "Columbus", "OH", "43215", "(614) 555-0118", "America/New_York"),
        "profile": {
            "Mood": "Quiet and neutral; no personality yet, on purpose.",
            "Fits": "Any brand. Pick it when nothing else fits or the brand is still forming.",
            "Density": "Medium.",
            "Contrast": "Standard; every text pair reaches 4.5:1 in light and dark.",
            "Type": "The device's own system font. No font to load.",
            "Adapt first": "Swap primary and ring for the brand colour, then the font.",
        },
        "principles": [
            "Start small: add a token only when two screens need it.",
            "One accent: colour is for the main action and for meaning.",
            "Name by role, never by value: primary, not blue.",
        ],
        "floor": True,
        "colors": {
            "background": ("#ffffff", "#0f0f0f"),
            "foreground": ("#171717", "#ededed"),
            "card": ("#ffffff", "#171717"),
            "card-foreground": ("#171717", "#ededed"),
            "muted": ("#f4f4f4", "#222222"),
            "muted-foreground": ("#5c5c5c", "#a3a3a3"),
            "primary": ("#2459d6", "#7aa2ff"),
            "primary-foreground": ("#ffffff", "#0b1430"),
            "secondary": ("#efefef", "#262626"),
            "secondary-foreground": ("#171717", "#ededed"),
            "border": ("#e4e4e4", "#2c2c2c"),
            "input": ("#8a8a8a", "#6e6e6e"),
            "ring": ("#2459d6", "#7aa2ff"),
            "destructive": ("#c0281b", "#ff8a80"),
            "destructive-foreground": ("#ffffff", "#2a0704"),
            "success": ("#1d7438", "#5fcf86"),
            "warning": ("#8c5a00", "#e8b04a"),
        },
        "type": [
            ("title", "Headings", SANS, 600, 28, 36, -0.01, "The page title."),
            ("heading", "Headings", SANS, 600, 18, 26, 0, "Section headings inside a page."),
            ("body", "Text", SANS, 400, 15, 24, 0, "Everything people read."),
            ("caption", "Text", SANS, 500, 12, 16, 0.01, "Labels over values, timestamps, small print."),
            ("code", "Code", MONO, 400, 13, 20, 0, "Code, ids and values people copy."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between related controls."), ("space-4", 16, "Padding of a card or a dialog."), ("space-8", 32, "Between sections of a page.")],
        "radius": [("radius-sm", 4, "Tags and checkboxes."), ("radius-md", 6, "Buttons, fields, cards and menus."), ("radius-full", 9999, "Avatars, pills and switches.")],
        "shadows": [
            ("shadow-sm", [(0, 1, 2, 0, "#00000014")], [(0, 1, 2, 0, "#00000066")], "Cards resting on the page."),
            ("shadow-md", [(0, 4, 12, -2, "#0000001a")], [(0, 4, 12, -2, "#00000099")], "Popovers and floating bars."),
            ("shadow-lg", [(0, 12, 28, -6, "#0000001f"), (0, 4, 8, -4, "#00000014")], [(0, 12, 28, -6, "#000000b3"), (0, 4, 8, -4, "#00000080")], "Menus and dialogs above everything."),
        ],
        "opacity": [("opacity-disabled", 0.5, "A control that cannot be used yet."), ("opacity-hover", 0.06, "The tint over a row or quiet button on hover."), ("opacity-overlay", 0.6, "The dim behind a dialog.")],
        "motion": [("motion-fast", 120, "ease-out", "Hover, press and focus."), ("motion-base", 200, "ease-in-out", "Menus, panels and dialogs opening."), ("motion-slow", 300, "ease-in-out", "Page changes and large panels.")],
        "ui": {"font": SANS, "h": 34, "pad": 14, "weight": 500, "fs": 14, "case": "none", "track": 0, "bw": 1, "card_r": "var(--radius)", "pill": "var(--radius-full, 999px)"},
    },
    {
        "slug": "calm-neutral",
        "id": "SP0491",
        "name": "Calm neutral",
        "description": "Cool greys, an indigo action and soft cards: the modern software look.",
        "forWho": "Software products and SaaS teams",
        "tags": ["design system", "starter", "saas", "calm", "modern", "software"],
        "vertical": "Design systems — software and SaaS",
        "person": "Tomasz Wierzbicki",
        "studio": ("Lattice Row Software", "A small software company with a web app and a dashboard.", "latticerow.net", "Brannock Street", "Denver", "CO", "80205", "(720) 555-0142", "America/Denver"),
        "profile": {
            "Mood": "Calm, clear and current; gets out of the way of the work.",
            "Fits": "Software, dashboards, productivity, B2B tools, startups.",
            "Density": "Medium; comfortable tables and forms.",
            "Contrast": "Standard; quiet greys that still reach 4.5:1.",
            "Type": "Inter for everything, falling back to the system font.",
            "Adapt first": "Primary and ring to the brand colour; keep the greys.",
        },
        "principles": [
            "Clear before clever: every screen says what it is for in its first line.",
            "Calm by default: colour is for meaning, never decoration.",
            "One way to do one thing: a colour, a size or a component has one name.",
        ],
        "colors": {
            "background": ("#fbfcfd", "#0e1117"),
            "foreground": ("#1b2130", "#e6e9ef"),
            "card": ("#ffffff", "#151922"),
            "card-foreground": ("#1b2130", "#e6e9ef"),
            "popover": ("#ffffff", "#1a1f2a"),
            "popover-foreground": ("#1b2130", "#e6e9ef"),
            "muted": ("#f1f3f7", "#1c212c"),
            "muted-foreground": ("#566072", "#98a1b2"),
            "primary": ("#4f46e5", "#8b8cf8"),
            "primary-foreground": ("#ffffff", "#12123a"),
            "secondary": ("#eceff5", "#232937"),
            "secondary-foreground": ("#262d3d", "#dfe3ea"),
            "accent": ("#eef0ff", "#23264a"),
            "accent-foreground": ("#3a32b0", "#c7caff"),
            "border": ("#e3e7ee", "#272d39"),
            "input": ("#8a92a2", "#646c7e"),
            "ring": ("#5b54e8", "#8b8cf8"),
            "destructive": ("#c62f2a", "#f2827b"),
            "destructive-foreground": ("#ffffff", "#2a0807"),
            "success": ("#17744b", "#4fcf91"),
            "warning": ("#8f5500", "#f0b24a"),
        },
        "type": [
            ("display", "Display", "Inter, " + SANS, 700, 44, 52, -0.025, "One per page at most: a landing headline."),
            ("title", "Headings", "Inter, " + SANS, 600, 28, 36, -0.015, "The page title."),
            ("heading", "Headings", "Inter, " + SANS, 600, 18, 26, -0.005, "Section headings inside a page."),
            ("body", "Text", "Inter, " + SANS, 400, 14, 22, 0, "Everything people read."),
            ("label", "Text", "Inter, " + SANS, 500, 13, 18, 0, "Buttons, field labels and tabs."),
            ("caption", "Text", "Inter, " + SANS, 400, 12, 16, 0.01, "Timestamps, hints and small print."),
            ("code", "Code", "'JetBrains Mono', " + MONO, 400, 13, 20, 0, "Code, ids and values people copy."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between related controls in a row."), ("space-3", 12, "Inside a compact card."), ("space-4", 16, "Padding of a card or a dialog."), ("space-6", 24, "Between groups inside a section."), ("space-8", 32, "Between sections of a page."), ("space-12", 48, "Above a page title.")],
        "radius": [("radius-sm", 4, "Chips, tags and checkboxes."), ("radius-md", 8, "Buttons, fields and menus."), ("radius-lg", 12, "Cards, dialogs and panels."), ("radius-full", 9999, "Avatars, pills and switches.")],
        "shadows": [
            ("shadow-sm", [(0, 1, 2, 0, "#0f172a12")], [(0, 1, 2, 0, "#00000059")], "Cards resting on the page."),
            ("shadow-md", [(0, 4, 10, -2, "#0f172a14"), (0, 2, 4, -2, "#0f172a0d")], [(0, 4, 10, -2, "#00000080"), (0, 2, 4, -2, "#00000066")], "Menus and popovers over content."),
            ("shadow-lg", [(0, 16, 32, -8, "#0f172a29"), (0, 6, 12, -4, "#0f172a12")], [(0, 16, 32, -8, "#000000b3"), (0, 6, 12, -4, "#00000080")], "Dialogs, the highest layer on screen."),
        ],
        "opacity": [("opacity-disabled", 0.45, "A control that cannot be used yet."), ("opacity-hover", 0.08, "The tint laid over a row or a quiet button on hover."), ("opacity-overlay", 0.5, "The dim behind a dialog.")],
        "motion": [("motion-fast", 120, "ease-out", "Hover, press and focus."), ("motion-base", 180, "cubic-bezier(0.2, 0, 0, 1)", "Menus and popovers opening."), ("motion-slow", 260, "cubic-bezier(0.2, 0, 0, 1)", "Dialogs and side panels.")],
        "ui": {"font": "Inter, " + SANS, "h": 32, "pad": 14, "weight": 500, "fs": 13, "case": "none", "track": 0, "bw": 1, "card_r": "var(--radius-lg, 12px)", "pill": "var(--radius-full, 999px)"},
    },
    {
        "slug": "editorial",
        "id": "SP0492",
        "name": "Editorial",
        "description": "Warm paper, ink and an oxblood accent, with serif headings made for reading.",
        "forWho": "Publishers, writers, journals and cultural brands",
        "tags": ["design system", "starter", "editorial", "serif", "warm", "publishing"],
        "vertical": "Design systems — publishing and media",
        "person": "Marguerite Okonjo",
        "studio": ("Quillstone Review", "A small quarterly that publishes essays online and in print.", "quillstonereview.net", "Ashby Mews", "Providence", "RI", "02903", "(401) 555-0127", "America/New_York"),
        "profile": {
            "Mood": "Warm, literate and unhurried; a printed page on a screen.",
            "Fits": "Publishing, media, journals, books, museums, nonprofits, consultancies.",
            "Density": "Airy; long lines of text at a comfortable measure.",
            "Contrast": "Standard; ink on paper, never pure black on pure white.",
            "Type": "Fraunces headings, Source Serif 4 body, falling back to Georgia; sans for small labels.",
            "Adapt first": "Primary to the brand colour; keep the paper tones and the serif.",
        },
        "principles": [
            "Reading comes first: body text is set for long reading, never squeezed.",
            "Ink on paper: warm grounds, near-black text, one accent used sparingly.",
            "Hierarchy by type, not by boxes: size and weight do the work.",
        ],
        "colors": {
            "background": ("#faf7f1", "#17140f"),
            "foreground": ("#211b14", "#ece5d8"),
            "card": ("#fffdf8", "#1f1b15"),
            "card-foreground": ("#211b14", "#ece5d8"),
            "popover": ("#fffdf8", "#25201a"),
            "popover-foreground": ("#211b14", "#ece5d8"),
            "muted": ("#f1ebdf", "#29241c"),
            "muted-foreground": ("#665847", "#b2a691"),
            "primary": ("#8a2b1f", "#e8937f"),
            "primary-foreground": ("#fffaf3", "#2a0c06"),
            "secondary": ("#ebe3d4", "#302a21"),
            "secondary-foreground": ("#2b241b", "#e7dfd0"),
            "accent": ("#f6e7cf", "#3a2e1c"),
            "accent-foreground": ("#5a3a10", "#f0d3a6"),
            "border": ("#e3dacb", "#352e24"),
            "input": ("#968872", "#776b59"),
            "ring": ("#8a2b1f", "#e8937f"),
            "destructive": ("#a8241c", "#f08a7e"),
            "destructive-foreground": ("#fffaf3", "#2a0905"),
            "success": ("#3a662c", "#9cc98a"),
            "warning": ("#835400", "#e6b45c"),
        },
        "type": [
            ("display", "Display", "Fraunces, 'Iowan Old Style', Georgia, serif", 600, 52, 58, -0.02, "A cover line or an essay title."),
            ("title", "Headings", "Fraunces, 'Iowan Old Style', Georgia, serif", 600, 32, 40, -0.01, "The page title."),
            ("heading", "Headings", "Fraunces, 'Iowan Old Style', Georgia, serif", 600, 22, 30, 0, "Section headings inside a piece."),
            ("body", "Text", "'Source Serif 4', 'Iowan Old Style', Georgia, serif", 400, 18, 30, 0, "Long reading, at about 65 characters a line."),
            ("standfirst", "Text", "'Source Serif 4', 'Iowan Old Style', Georgia, serif", 400, 21, 32, 0, "The opening paragraph under a title."),
            ("label", "Text", "'Source Sans 3', " + SANS, 600, 12, 16, 0.08, "Kickers, bylines and buttons, in small capitals."),
            ("code", "Code", MONO, 400, 14, 22, 0, "Code and values people copy."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between related controls."), ("space-4", 16, "Padding of a card."), ("space-6", 24, "Between paragraphs and figures."), ("space-10", 40, "Between sections of a piece."), ("space-16", 64, "Above a title, around a pull quote.")],
        "radius": [("radius-sm", 2, "Tags and inputs."), ("radius-md", 4, "Buttons, fields and menus."), ("radius-lg", 6, "Cards and figures.")],
        "shadows": [
            ("shadow-sm", [(0, 1, 0, 0, "#3b2a1414")], [(0, 1, 0, 0, "#00000080")], "A hairline lift for cards on paper."),
            ("shadow-md", [(0, 8, 24, -8, "#3b2a1424")], [(0, 8, 24, -8, "#000000b3")], "Menus and the image lightbox."),
            ("shadow-lg", [(0, 20, 48, -16, "#3b2a1433")], [(0, 20, 48, -16, "#000000cc")], "Dialogs and the reading drawer."),
        ],
        "opacity": [("opacity-disabled", 0.5, "A control that cannot be used yet."), ("opacity-caption", 0.85, "An image caption laid over the picture."), ("opacity-overlay", 0.7, "The dim behind a lightbox.")],
        "motion": [("motion-fast", 150, "ease-out", "Hover, press and focus."), ("motion-base", 240, "ease-in-out", "Menus and drawers."), ("motion-page", 400, "ease-in-out", "Fading a new page or image in.")],
        "ui": {"font": "'Source Sans 3', " + SANS, "h": 36, "pad": 16, "weight": 600, "fs": 12, "case": "uppercase", "track": 0.08, "bw": 1, "card_r": "var(--radius-lg, 6px)", "pill": "var(--radius-sm, 2px)", "heading_font": "Fraunces, 'Iowan Old Style', Georgia, serif"},
    },
    {
        "slug": "bold-contrast",
        "id": "SP0493",
        "name": "Bold high-contrast",
        "description": "Black, white and a hot orange; square corners and hard offset shadows.",
        "forWho": "Brands that want to be loud, direct and unmistakable",
        "tags": ["design system", "starter", "bold", "high contrast", "brutalist", "events"],
        "vertical": "Design systems — bold brands, events, sport and retail",
        "person": "Kwame Asante-Bell",
        "studio": ("Loudhaus Events", "An events company selling tickets for music nights.", "loudhausevents.net", "Gantry Way", "Detroit", "MI", "48207", "(313) 555-0186", "America/Detroit"),
        "profile": {
            "Mood": "Loud, confident and graphic; nothing is subtle.",
            "Fits": "Events, sport, streetwear, music, campaigns, launches, retail sales.",
            "Density": "Medium; big type, thick lines.",
            "Contrast": "High; text reaches 7:1 or more on its ground in most pairs.",
            "Type": "Archivo at heavy weights, falling back to Helvetica and Arial.",
            "Adapt first": "Primary to the brand's loudest colour (keep black text on it if it is light).",
        },
        "principles": [
            "Say it once, say it big: one headline, one action per screen.",
            "Lines, not shades: thick black edges instead of soft greys.",
            "Contrast is the brand: text never drops below 7:1 where it can be helped.",
        ],
        "colors": {
            "background": ("#ffffff", "#000000"),
            "foreground": ("#000000", "#ffffff"),
            "card": ("#ffffff", "#0d0d0d"),
            "card-foreground": ("#000000", "#ffffff"),
            "popover": ("#ffffff", "#141414"),
            "popover-foreground": ("#000000", "#ffffff"),
            "muted": ("#f0f0f0", "#1a1a1a"),
            "muted-foreground": ("#3a3a3a", "#c4c4c4"),
            "primary": ("#ff4f00", "#ff5c14"),
            "primary-foreground": ("#000000", "#000000"),
            "secondary": ("#000000", "#ffffff"),
            "secondary-foreground": ("#ffffff", "#000000"),
            "accent": ("#ffe500", "#ffe500"),
            "accent-foreground": ("#000000", "#000000"),
            "border": ("#000000", "#ffffff"),
            "input": ("#262626", "#e0e0e0"),
            "ring": ("#0047ff", "#5c8aff"),
            "destructive": ("#c00021", "#ff6b78"),
            "destructive-foreground": ("#ffffff", "#000000"),
            "success": ("#006b2e", "#38e07b"),
            "warning": ("#7a4a00", "#ffc233"),
        },
        "type": [
            ("display", "Display", "Archivo, 'Helvetica Neue', Arial, sans-serif", 900, 64, 64, -0.035, "The poster line. One per screen."),
            ("title", "Headings", "Archivo, 'Helvetica Neue', Arial, sans-serif", 800, 36, 40, -0.02, "The page title."),
            ("heading", "Headings", "Archivo, 'Helvetica Neue', Arial, sans-serif", 800, 20, 24, -0.01, "Section headings, often in capitals."),
            ("body", "Text", "Archivo, 'Helvetica Neue', Arial, sans-serif", 400, 16, 24, 0, "Everything people read."),
            ("label", "Text", "Archivo, 'Helvetica Neue', Arial, sans-serif", 800, 13, 16, 0.04, "Buttons and tags, in capitals."),
            ("code", "Code", "'Space Mono', " + MONO, 400, 14, 20, 0, "Codes, ticket numbers and values people copy."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between related controls."), ("space-4", 16, "Padding of a card."), ("space-6", 24, "Between groups."), ("space-12", 48, "Between sections."), ("space-20", 80, "Around a hero.")],
        "radius": [("radius-none", 0, "Everything: buttons, fields, cards."), ("radius-sm", 2, "Checkboxes and keyboard keys only."), ("radius-full", 9999, "Avatars only.")],
        "shadows": [
            ("shadow-hard-sm", [(3, 3, 0, 0, "#000000ff")], [(3, 3, 0, 0, "#ffffffff")], "Buttons and tags: a hard offset, no blur."),
            ("shadow-hard-md", [(6, 6, 0, 0, "#000000ff")], [(6, 6, 0, 0, "#ffffffff")], "Cards and menus."),
            ("shadow-hard-lg", [(10, 10, 0, 0, "#000000ff")], [(10, 10, 0, 0, "#ffffffff")], "Dialogs and the hero card."),
        ],
        "opacity": [("opacity-disabled", 0.4, "A control that cannot be used yet."), ("opacity-pressed", 0.9, "A button while it is held down."), ("opacity-overlay", 0.85, "The near-black behind a dialog.")],
        "motion": [("motion-snap", 80, "linear", "Press: the button drops onto its shadow."), ("motion-base", 160, "ease-out", "Menus and dialogs."), ("motion-slide", 240, "cubic-bezier(0.7, 0, 0.3, 1)", "Banners and panels sliding in, hard and fast.")],
        "ui": {"font": "Archivo, 'Helvetica Neue', Arial, sans-serif", "h": 40, "pad": 18, "weight": 800, "fs": 13, "case": "uppercase", "track": 0.04, "bw": 2, "card_r": "0px", "pill": "0px", "shadow": "var(--shadow-hard-sm, none)", "card_shadow": "var(--shadow-hard-md, none)", "radius": "0px"},
    },
    {
        "slug": "soft-rounded",
        "id": "SP0494",
        "name": "Soft rounded",
        "description": "Lavender, pink and mint pastels with generous corners and gentle shadows.",
        "forWho": "Friendly apps, kids and family brands, lifestyle shops",
        "tags": ["design system", "starter", "pastel", "rounded", "friendly", "lifestyle"],
        "vertical": "Design systems — friendly consumer and lifestyle",
        "person": "Ines Carvalho",
        "studio": ("Pebblebloom", "A small shop and app for planning family weekends.", "pebblebloom.net", "Marigold Court", "Austin", "TX", "78704", "(512) 555-0139", "America/Chicago"),
        "profile": {
            "Mood": "Soft, kind and approachable; nothing sharp.",
            "Fits": "Family, parenting, lifestyle, gifting, wellness apps, small shops, education for children.",
            "Density": "Spacious; large touch targets.",
            "Contrast": "Standard; pastel grounds with deep text so it still reads at 4.5:1.",
            "Type": "Nunito, rounded, falling back to Avenir Next and the system font.",
            "Adapt first": "Primary to the brand colour, then pick two pastels near it for secondary and accent.",
        },
        "principles": [
            "Soft edges, firm text: corners are round, words stay dark and legible.",
            "Pastel grounds, never pastel text: tints fill, deep colours speak.",
            "Room to breathe: generous padding and large targets.",
        ],
        "colors": {
            "background": ("#fbf9ff", "#17141f"),
            "foreground": ("#2b2540", "#ece8f7"),
            "card": ("#ffffff", "#1f1b2b"),
            "card-foreground": ("#2b2540", "#ece8f7"),
            "popover": ("#ffffff", "#241f32"),
            "popover-foreground": ("#2b2540", "#ece8f7"),
            "muted": ("#f3effb", "#282338"),
            "muted-foreground": ("#625b7c", "#aaa2c4"),
            "primary": ("#6747e8", "#b4a2ff"),
            "primary-foreground": ("#ffffff", "#1e1640"),
            "secondary": ("#ffe8f0", "#3a2230"),
            "secondary-foreground": ("#6b1f3d", "#ffd0e0"),
            "accent": ("#e1f6ec", "#17352b"),
            "accent-foreground": ("#145c43", "#b5ecd6"),
            "border": ("#ebe5f6", "#302a41"),
            "input": ("#9088aa", "#71688f"),
            "ring": ("#8a70ff", "#b4a2ff"),
            "destructive": ("#c22a5c", "#ff8fb0"),
            "destructive-foreground": ("#ffffff", "#3a0a1a"),
            "success": ("#1c7350", "#7fdcae"),
            "warning": ("#8a5806", "#f3c46b"),
        },
        "type": [
            ("display", "Display", "Nunito, 'Avenir Next', " + SANS, 800, 44, 52, -0.01, "One per page at most: a welcome headline."),
            ("title", "Headings", "Nunito, 'Avenir Next', " + SANS, 800, 28, 36, 0, "The page title."),
            ("heading", "Headings", "Nunito, 'Avenir Next', " + SANS, 700, 19, 28, 0, "Section headings inside a page."),
            ("body", "Text", "Nunito, 'Avenir Next', " + SANS, 400, 16, 26, 0, "Everything people read."),
            ("label", "Text", "Nunito, 'Avenir Next', " + SANS, 700, 14, 20, 0, "Buttons, chips and field labels."),
            ("caption", "Text", "Nunito, 'Avenir Next', " + SANS, 600, 13, 18, 0, "Hints and small print."),
            ("code", "Code", MONO, 400, 13, 20, 0, "Codes and values people copy."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between chips."), ("space-3", 12, "Between related controls."), ("space-5", 20, "Padding of a card."), ("space-8", 32, "Between groups."), ("space-12", 48, "Between sections.")],
        "radius": [("radius-sm", 10, "Chips, tags and small inputs."), ("radius-md", 16, "Buttons, fields and menus."), ("radius-lg", 24, "Cards, dialogs and sheets."), ("radius-full", 9999, "Pills, avatars and switches.")],
        "shadows": [
            ("shadow-sm", [(0, 2, 6, 0, "#5b3fd914")], [(0, 2, 6, 0, "#00000059")], "Cards resting on the page."),
            ("shadow-md", [(0, 10, 24, -6, "#5b3fd924")], [(0, 10, 24, -6, "#00000099")], "Menus, sheets and floating buttons."),
            ("shadow-lg", [(0, 24, 48, -12, "#5b3fd92e")], [(0, 24, 48, -12, "#000000b3")], "Dialogs."),
        ],
        "opacity": [("opacity-disabled", 0.5, "A control that cannot be used yet."), ("opacity-tint", 0.12, "A colour wash behind an icon."), ("opacity-overlay", 0.4, "The soft dim behind a sheet.")],
        "motion": [("motion-fast", 140, "ease-out", "Hover, press and focus."), ("motion-base", 240, "cubic-bezier(0.34, 1.3, 0.64, 1)", "A gentle overshoot as cards and sheets arrive."), ("motion-slow", 360, "ease-in-out", "Page changes.")],
        "ui": {"font": "Nunito, 'Avenir Next', " + SANS, "h": 40, "pad": 20, "weight": 700, "fs": 14, "case": "none", "track": 0, "bw": 1, "card_r": "var(--radius-lg, 24px)", "pill": "var(--radius-full, 999px)", "btn_r": "var(--radius-full, 999px)", "card_shadow": "var(--shadow-sm, none)"},
    },
    {
        "slug": "dark-developer",
        "id": "SP0495",
        "name": "Dark-first developer tool",
        "description": "Dark by default: near-black panels, a mint action and mono details. Dense.",
        "forWho": "Developer tools, consoles, data and infrastructure products",
        "tags": ["design system", "starter", "dark", "developer", "dense", "technical"],
        "vertical": "Design systems — developer and data tools",
        "person": "Ravi Subramaniam",
        "studio": ("Kernelpine", "A team building a command line and console for data pipelines.", "kernelpine.net", "Foundry Alley", "Seattle", "WA", "98134", "(206) 555-0174", "America/Los_Angeles"),
        "profile": {
            "Mood": "Focused, technical and fast; designed in dark first, light kept equal.",
            "Fits": "Developer tools, consoles, observability, data, security, crypto infrastructure, AI tooling.",
            "Density": "Dense; small type, tight rows, keyboard first.",
            "Contrast": "Standard to high; every pair reaches 4.5:1 in both themes.",
            "Type": "Inter for the interface, JetBrains Mono for code and ids.",
            "Adapt first": "Primary to the brand's signal colour; keep the dark greys.",
        },
        "principles": [
            "Dark first, light equal: every token is chosen on dark and proven on light.",
            "Dense, not cramped: tight rows, but 4.5:1 text and visible focus.",
            "Mono for machine values: ids, keys, paths and numbers people copy.",
        ],
        "colors": {
            "background": ("#f7f8fa", "#0b0d10"),
            "foreground": ("#11151b", "#d9dfe7"),
            "card": ("#ffffff", "#12151a"),
            "card-foreground": ("#11151b", "#d9dfe7"),
            "popover": ("#ffffff", "#161a20"),
            "popover-foreground": ("#11151b", "#d9dfe7"),
            "muted": ("#eceff3", "#191d23"),
            "muted-foreground": ("#505966", "#8d97a5"),
            "primary": ("#0a7550", "#3ddc97"),
            "primary-foreground": ("#ffffff", "#03140c"),
            "secondary": ("#e5e8ed", "#1f242c"),
            "secondary-foreground": ("#1b2027", "#d9dfe7"),
            "accent": ("#e3efff", "#16263a"),
            "accent-foreground": ("#0b4a8a", "#8cc8ff"),
            "border": ("#dce0e6", "#242a33"),
            "input": ("#878f9c", "#5d6776"),
            "ring": ("#0a7550", "#3ddc97"),
            "destructive": ("#bf2a2a", "#ff7a7a"),
            "destructive-foreground": ("#ffffff", "#1a0505"),
            "success": ("#0a7550", "#3ddc97"),
            "warning": ("#855000", "#ffb454"),
        },
        "type": [
            ("title", "Headings", "Inter, " + SANS, 600, 22, 28, -0.01, "The page title."),
            ("heading", "Headings", "Inter, " + SANS, 600, 15, 22, 0, "Panel and section headings."),
            ("body", "Text", "Inter, " + SANS, 400, 13, 20, 0, "Everything people read; the default size."),
            ("label", "Text", "Inter, " + SANS, 500, 12, 16, 0, "Buttons, field labels and column headers."),
            ("caption", "Text", "Inter, " + SANS, 400, 11, 14, 0.02, "Timestamps and status lines."),
            ("code", "Code", "'JetBrains Mono', " + MONO, 400, 12.5, 18, 0, "Code, logs, ids and keys."),
            ("code-block", "Code", "'JetBrains Mono', " + MONO, 400, 13, 20, 0, "Multi-line code and terminal output."),
        ],
        "spacing": [("space-0-5", 2, "Inside a badge."), ("space-1", 4, "Between an icon and its label."), ("space-1-5", 6, "Table cell padding, top and bottom."), ("space-2", 8, "Between related controls."), ("space-3", 12, "Padding of a panel."), ("space-4", 16, "Between groups."), ("space-6", 24, "Between sections.")],
        "radius": [("radius-sm", 3, "Badges, keys and checkboxes."), ("radius-md", 6, "Buttons, fields and menus."), ("radius-lg", 8, "Panels and dialogs.")],
        "shadows": [
            ("shadow-sm", [(0, 1, 2, 0, "#0b0d1014")], [(0, 0, 0, 1, "#ffffff0f")], "Panels: a shadow on light, a hairline glow on dark."),
            ("shadow-md", [(0, 8, 20, -6, "#0b0d1029")], [(0, 8, 24, -6, "#000000cc"), (0, 0, 0, 1, "#ffffff14")], "Menus, command palette and dialogs."),
            ("shadow-lg", [(0, 20, 40, -12, "#0b0d1033")], [(0, 20, 48, -12, "#000000e6"), (0, 0, 0, 1, "#ffffff1a")], "Modal dialogs over the whole console."),
        ],
        "opacity": [("opacity-disabled", 0.4, "A control that cannot be used yet."), ("opacity-hover", 0.06, "The tint over a row on hover."), ("opacity-selected", 0.12, "The tint over a selected row.")],
        "motion": [("motion-instant", 80, "linear", "Hover and focus; nearly instant."), ("motion-fast", 140, "cubic-bezier(0.2, 0, 0, 1)", "Menus and the command palette."), ("motion-base", 200, "cubic-bezier(0.2, 0, 0, 1)", "Side panels and dialogs.")],
        "ui": {"font": "Inter, " + SANS, "h": 28, "pad": 10, "weight": 500, "fs": 12, "case": "none", "track": 0, "bw": 1, "card_r": "var(--radius-lg, 8px)", "pill": "var(--radius-sm, 3px)", "mono": "'JetBrains Mono', " + MONO},
    },
    {
        "slug": "trust",
        "id": "SP0496",
        "name": "Trust",
        "description": "Sober navy, crisp white and conservative corners for money and law.",
        "forWho": "Finance, legal, insurance and professional services",
        "tags": ["design system", "starter", "trust", "finance", "legal", "conservative"],
        "vertical": "Design systems — finance, legal and insurance",
        "person": "Eleanor Mbeki-Shaw",
        "studio": ("Harrowgate Partners", "A small firm handling wills, estates and family trusts.", "harrowgatepartners.net", "Calloway Square", "Richmond", "VA", "23219", "(804) 555-0191", "America/New_York"),
        "profile": {
            "Mood": "Sober, steady and exact; nothing that could feel like a gamble.",
            "Fits": "Banking, accounting, law, insurance, wealth, government, enterprise B2B.",
            "Density": "Medium; tables and numbers read easily.",
            "Contrast": "High; navy on white, text pairs mostly above 7:1.",
            "Type": "IBM Plex Serif headings and IBM Plex Sans body, falling back to Georgia and Helvetica; numbers in tabular figures.",
            "Adapt first": "Primary to the firm's colour if it is dark; otherwise keep navy and use the brand colour as accent.",
        },
        "principles": [
            "Exact over exciting: numbers line up, labels say precisely what a figure is.",
            "Nothing surprising: every action says what will happen before it happens.",
            "Quiet authority: navy and white, one warm accent, square-ish corners.",
        ],
        "colors": {
            "background": ("#ffffff", "#0a1220"),
            "foreground": ("#0f1d33", "#e3e8ef"),
            "card": ("#ffffff", "#101a2c"),
            "card-foreground": ("#0f1d33", "#e3e8ef"),
            "popover": ("#ffffff", "#132036"),
            "popover-foreground": ("#0f1d33", "#e3e8ef"),
            "muted": ("#f1f4f8", "#16223a"),
            "muted-foreground": ("#4b586b", "#a1aec3"),
            "primary": ("#12305e", "#93b5ec"),
            "primary-foreground": ("#ffffff", "#0a1730"),
            "secondary": ("#e7ecf3", "#1b2944"),
            "secondary-foreground": ("#12305e", "#d9e2ef"),
            "accent": ("#f4efe2", "#2b2616"),
            "accent-foreground": ("#5c4a1a", "#e6d6a8"),
            "border": ("#d8dee7", "#24324e"),
            "input": ("#7a8494", "#5c6e90"),
            "ring": ("#2a5db0", "#93b5ec"),
            "destructive": ("#a51d24", "#f28b8b"),
            "destructive-foreground": ("#ffffff", "#2b0708"),
            "success": ("#1d6843", "#78c9a0"),
            "warning": ("#835600", "#e3b55a"),
        },
        "type": [
            ("display", "Display", "'IBM Plex Serif', Georgia, 'Times New Roman', serif", 600, 40, 48, -0.01, "A report cover or a landing headline."),
            ("title", "Headings", "'IBM Plex Serif', Georgia, 'Times New Roman', serif", 600, 28, 36, 0, "The page title."),
            ("heading", "Headings", "'IBM Plex Sans', " + SANS, 600, 17, 24, 0, "Section headings inside a page."),
            ("body", "Text", "'IBM Plex Sans', " + SANS, 400, 15, 24, 0, "Everything people read."),
            ("figure", "Text", "'IBM Plex Sans', " + SANS, 500, 15, 24, 0, "Amounts and dates, in tabular figures, right aligned."),
            ("caption", "Text", "'IBM Plex Sans', " + SANS, 400, 12, 16, 0.01, "Footnotes, sources and small print."),
            ("code", "Code", "'IBM Plex Mono', " + MONO, 400, 13, 20, 0, "Reference numbers and account ids."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between related controls."), ("space-3", 12, "Table cell padding."), ("space-4", 16, "Padding of a card."), ("space-6", 24, "Between groups."), ("space-10", 40, "Between sections.")],
        "radius": [("radius-sm", 2, "Tags and checkboxes."), ("radius-md", 4, "Buttons, fields and menus."), ("radius-lg", 6, "Cards and dialogs.")],
        "shadows": [
            ("shadow-sm", [(0, 1, 1, 0, "#0f1d3314")], [(0, 1, 1, 0, "#00000066")], "Cards resting on the page."),
            ("shadow-md", [(0, 6, 16, -4, "#0f1d3324")], [(0, 6, 16, -4, "#000000a6")], "Menus and popovers."),
            ("shadow-lg", [(0, 16, 36, -10, "#0f1d332e")], [(0, 16, 36, -10, "#000000cc")], "Dialogs and confirmations."),
        ],
        "opacity": [("opacity-disabled", 0.5, "A control that cannot be used yet."), ("opacity-hover", 0.05, "The tint over a table row on hover."), ("opacity-overlay", 0.6, "The dim behind a dialog.")],
        "motion": [("motion-fast", 120, "ease-out", "Hover, press and focus."), ("motion-base", 200, "ease-in-out", "Menus and dialogs. Nothing bounces."), ("motion-slow", 280, "ease-in-out", "Side panels and statements opening.")],
        "ui": {"font": "'IBM Plex Sans', " + SANS, "h": 36, "pad": 16, "weight": 600, "fs": 14, "case": "none", "track": 0, "bw": 1, "card_r": "var(--radius-lg, 6px)", "pill": "var(--radius-sm, 2px)", "heading_font": "'IBM Plex Serif', Georgia, 'Times New Roman', serif"},
    },
    {
        "slug": "care",
        "id": "SP0497",
        "name": "Care",
        "description": "Calm teal, soft grounds, larger text and big targets, accessible by default.",
        "forWho": "Healthcare, clinics, therapy, wellness and care services",
        "tags": ["design system", "starter", "healthcare", "wellness", "accessible", "large text"],
        "vertical": "Design systems — healthcare and wellness",
        "person": "Dr. Amara Lindqvist",
        "studio": ("Willowmere Family Clinic", "A family clinic with online booking and a patient portal.", "willowmereclinic.net", "Larkspur Road", "Minneapolis", "MN", "55408", "(612) 555-0153", "America/Chicago"),
        "profile": {
            "Mood": "Calm, reassuring and plain-spoken; nothing alarming unless it must be.",
            "Fits": "Clinics, hospitals, therapy, pharmacy, elder care, wellness, public services.",
            "Density": "Spacious; 17px body text and 44px touch targets.",
            "Contrast": "High; most text pairs reach 7:1, every pair at least 4.5:1.",
            "Type": "Atkinson Hyperlegible, made for low vision, falling back to the system font.",
            "Adapt first": "Primary to the brand colour if it stays dark enough for white text; keep the larger sizes.",
        },
        "principles": [
            "Readable by everyone: larger text, high contrast, plain words.",
            "Calm, then clear: alarms are rare, so they are noticed when they come.",
            "Easy to hit: every target is at least 44 pixels tall.",
        ],
        "colors": {
            "background": ("#f7fbfa", "#0d1816"),
            "foreground": ("#12302a", "#e2efec"),
            "card": ("#ffffff", "#13211e"),
            "card-foreground": ("#12302a", "#e2efec"),
            "popover": ("#ffffff", "#172724"),
            "popover-foreground": ("#12302a", "#e2efec"),
            "muted": ("#e9f2ef", "#1a2c28"),
            "muted-foreground": ("#3d5c55", "#a8c3bc"),
            "primary": ("#0d6b61", "#6fd1c2"),
            "primary-foreground": ("#ffffff", "#062420"),
            "secondary": ("#e0eeea", "#1f3430"),
            "secondary-foreground": ("#12302a", "#d9ebe6"),
            "accent": ("#fdf0e3", "#33261a"),
            "accent-foreground": ("#773c0d", "#f6cfa8"),
            "border": ("#d1e2dd", "#263b36"),
            "input": ("#6c8781", "#628079"),
            "ring": ("#0d6b61", "#6fd1c2"),
            "destructive": ("#ab2219", "#ff958b"),
            "destructive-foreground": ("#ffffff", "#2a0806"),
            "success": ("#1c6636", "#86d6a0"),
            "warning": ("#7f4d00", "#f0bf6b"),
        },
        "type": [
            ("display", "Display", "'Atkinson Hyperlegible', " + SANS, 700, 40, 50, -0.01, "A welcome line. One per page at most."),
            ("title", "Headings", "'Atkinson Hyperlegible', " + SANS, 700, 30, 38, 0, "The page title."),
            ("heading", "Headings", "'Atkinson Hyperlegible', " + SANS, 700, 21, 30, 0, "Section headings inside a page."),
            ("body", "Text", "'Atkinson Hyperlegible', " + SANS, 400, 17, 28, 0, "Everything people read. Never smaller."),
            ("label", "Text", "'Atkinson Hyperlegible', " + SANS, 700, 16, 22, 0, "Buttons and field labels."),
            ("caption", "Text", "'Atkinson Hyperlegible', " + SANS, 400, 14, 20, 0.01, "Hints and small print; the smallest size used."),
            ("code", "Code", MONO, 400, 15, 22, 0, "Reference and booking numbers."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between a label and its field."), ("space-3", 12, "Between related controls."), ("space-5", 20, "Padding of a card."), ("space-8", 32, "Between groups."), ("space-12", 48, "Between sections."), ("target-min", 44, "The smallest height of anything people press.")],
        "radius": [("radius-sm", 6, "Tags and checkboxes."), ("radius-md", 10, "Buttons, fields and menus."), ("radius-lg", 16, "Cards and dialogs."), ("radius-full", 9999, "Avatars and switches.")],
        "shadows": [
            ("shadow-sm", [(0, 1, 3, 0, "#12302a14")], [(0, 1, 3, 0, "#00000066")], "Cards resting on the page."),
            ("shadow-md", [(0, 8, 20, -6, "#12302a24")], [(0, 8, 20, -6, "#000000a6")], "Menus and popovers."),
            ("shadow-lg", [(0, 16, 36, -10, "#12302a2e")], [(0, 16, 36, -10, "#000000cc")], "Dialogs and booking confirmations."),
        ],
        "opacity": [("opacity-disabled", 0.55, "A control that cannot be used yet; kept readable."), ("opacity-tint", 0.1, "A soft wash behind an icon or a notice."), ("opacity-overlay", 0.5, "The dim behind a dialog.")],
        "motion": [("motion-fast", 150, "ease-out", "Hover, press and focus."), ("motion-base", 250, "ease-in-out", "Menus and dialogs. Nothing flashes or bounces."), ("motion-reduced", 0, "linear", "What every motion becomes when a person asks for less motion.")],
        "ui": {"font": "'Atkinson Hyperlegible', " + SANS, "h": 44, "pad": 20, "weight": 700, "fs": 16, "case": "none", "track": 0, "bw": 2, "card_r": "var(--radius-lg, 16px)", "pill": "var(--radius-full, 999px)", "body_fs": 16},
    },
    {
        "slug": "playful",
        "id": "SP0498",
        "name": "Playful consumer",
        "description": "Coral, sunny yellow and sky blue with pill buttons and a bounce in its step.",
        "forWho": "Consumer apps, games, food and delivery, social products",
        "tags": ["design system", "starter", "playful", "colorful", "consumer", "rounded"],
        "vertical": "Design systems — consumer apps and games",
        "person": "Leilani Kahale",
        "studio": ("Snackjar", "A delivery app for small neighbourhood bakeries.", "snackjarapp.net", "Peppercorn Avenue", "San Diego", "CA", "92104", "(619) 555-0165", "America/Los_Angeles"),
        "profile": {
            "Mood": "Cheerful, energetic and a little cheeky.",
            "Fits": "Consumer apps, food and delivery, games, social, entertainment, kids' brands.",
            "Density": "Medium; chunky controls and bold labels.",
            "Contrast": "Standard; bright fills carry dark labels so every pair reaches 4.5:1.",
            "Type": "Baloo 2 headings and Nunito Sans body, falling back to Trebuchet MS and the system font.",
            "Adapt first": "Primary to the brand colour; keep dark labels on bright fills.",
        },
        "principles": [
            "Joy in the details: a bounce, a colour, a friendly word.",
            "Bright fills, dark words: labels on coral and yellow stay dark so they read.",
            "Big and tappable: pill buttons, chunky controls.",
        ],
        "colors": {
            "background": ("#fffaf4", "#1a1424"),
            "foreground": ("#241a33", "#f6eefb"),
            "card": ("#ffffff", "#231a31"),
            "card-foreground": ("#241a33", "#f6eefb"),
            "popover": ("#ffffff", "#2a2039"),
            "popover-foreground": ("#241a33", "#f6eefb"),
            "muted": ("#fff0e2", "#2d2340"),
            "muted-foreground": ("#6a5263", "#c2b3cf"),
            "primary": ("#ff5a5f", "#ff7a7f"),
            "primary-foreground": ("#2a0a0c", "#2a0a0c"),
            "secondary": ("#ffdf5e", "#ffd84d"),
            "secondary-foreground": ("#3d2e00", "#2b2000"),
            "accent": ("#cfe7ff", "#1a3558"),
            "accent-foreground": ("#0b3e75", "#bcdcff"),
            "border": ("#f1e1d3", "#3a2e4f"),
            "input": ("#9b8796", "#7c6c90"),
            "ring": ("#2f6bff", "#7aa6ff"),
            "destructive": ("#be1c3a", "#ff8aa0"),
            "destructive-foreground": ("#ffffff", "#33060f"),
            "success": ("#15724a", "#6fdc9f"),
            "warning": ("#8a5300", "#ffc15c"),
        },
        "type": [
            ("display", "Display", "'Baloo 2', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif", 800, 48, 52, -0.01, "A big friendly headline. One per screen."),
            ("title", "Headings", "'Baloo 2', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif", 800, 30, 36, 0, "The page title."),
            ("heading", "Headings", "'Baloo 2', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif", 700, 21, 26, 0, "Section headings and card titles."),
            ("body", "Text", "'Nunito Sans', " + SANS, 400, 16, 24, 0, "Everything people read."),
            ("label", "Text", "'Nunito Sans', " + SANS, 800, 14, 18, 0.01, "Buttons, chips and tabs."),
            ("caption", "Text", "'Nunito Sans', " + SANS, 600, 13, 18, 0, "Prices, times and small print."),
            ("code", "Code", MONO, 400, 14, 20, 0, "Promo codes and order numbers."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between chips."), ("space-3", 12, "Between related controls."), ("space-4", 16, "Padding of a card."), ("space-6", 24, "Between groups."), ("space-10", 40, "Between sections.")],
        "radius": [("radius-sm", 8, "Tags and small inputs."), ("radius-md", 14, "Fields and menus."), ("radius-lg", 22, "Cards and sheets."), ("radius-full", 9999, "Buttons, chips, avatars and switches.")],
        "shadows": [
            ("shadow-sm", [(0, 2, 0, 0, "#241a331f")], [(0, 2, 0, 0, "#00000080")], "Buttons and chips: a chunky, short drop."),
            ("shadow-md", [(0, 10, 22, -6, "#ff5a5f33")], [(0, 10, 22, -6, "#000000a6")], "Cards that float, with a warm tint."),
            ("shadow-lg", [(0, 20, 40, -10, "#241a3333")], [(0, 20, 40, -10, "#000000cc")], "Sheets and dialogs."),
        ],
        "opacity": [("opacity-disabled", 0.45, "A control that cannot be used yet."), ("opacity-tint", 0.16, "A colour wash behind an icon or a sticker."), ("opacity-overlay", 0.45, "The dim behind a sheet.")],
        "motion": [("motion-fast", 120, "ease-out", "Hover and focus."), ("motion-bounce", 320, "cubic-bezier(0.34, 1.56, 0.64, 1)", "A bounce when something is added or liked."), ("motion-base", 220, "ease-in-out", "Sheets and menus.")],
        "ui": {"font": "'Nunito Sans', " + SANS, "h": 40, "pad": 20, "weight": 800, "fs": 14, "case": "none", "track": 0.01, "bw": 2, "card_r": "var(--radius-lg, 22px)", "pill": "var(--radius-full, 999px)", "btn_r": "var(--radius-full, 999px)", "shadow": "var(--shadow-sm, none)", "heading_font": "'Baloo 2', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif"},
    },
    {
        "slug": "premium",
        "id": "SP0499",
        "name": "Premium",
        "description": "Ivory, near-black and a muted gold; fine serif type, sharp corners, slow motion.",
        "forWho": "Luxury, hospitality, jewellery, fashion and fine goods",
        "tags": ["design system", "starter", "premium", "luxury", "restrained", "fine type"],
        "vertical": "Design systems — luxury and hospitality",
        "person": "Sebastien Aurelio Marchand",
        "studio": ("Maison Verelle", "A small hotel and restaurant with an online booking page.", "maisonverelle.net", "Rue Orsanne", "New Orleans", "LA", "70116", "(504) 555-0108", "America/Chicago"),
        "profile": {
            "Mood": "Restrained, assured and quiet; luxury through space and type, not decoration.",
            "Fits": "Hotels, restaurants, fashion, jewellery, real estate, galleries, private banking.",
            "Density": "Very airy; few things per screen.",
            "Contrast": "High; near-black on ivory, every pair at least 4.5:1.",
            "Type": "Cormorant Garamond display and Jost text, falling back to Didot, Georgia and Futura.",
            "Adapt first": "Accent and ring to the house colour; keep the near-black primary.",
        },
        "principles": [
            "Less, better: one image, one line, one action.",
            "Type is the ornament: fine serifs, wide tracking on small capitals.",
            "Unhurried: slower motion and generous space signal care.",
        ],
        "colors": {
            "background": ("#fcfbf8", "#0d0c0b"),
            "foreground": ("#141210", "#eae6de"),
            "card": ("#ffffff", "#151412"),
            "card-foreground": ("#141210", "#eae6de"),
            "popover": ("#ffffff", "#1a1916"),
            "popover-foreground": ("#141210", "#eae6de"),
            "muted": ("#f3f0ea", "#1d1b18"),
            "muted-foreground": ("#5c564c", "#a39d92"),
            "primary": ("#141210", "#e8dfcc"),
            "primary-foreground": ("#fcfbf8", "#141210"),
            "secondary": ("#efebe3", "#23211d"),
            "secondary-foreground": ("#141210", "#eae6de"),
            "accent": ("#f4ecd9", "#2a2417"),
            "accent-foreground": ("#6b5320", "#d9bf86"),
            "border": ("#e6e0d4", "#2a2723"),
            "input": ("#8e8679", "#6a6459"),
            "ring": ("#8f7035", "#c9a961"),
            "destructive": ("#8f1d1d", "#e8968c"),
            "destructive-foreground": ("#ffffff", "#240807"),
            "success": ("#2e5b39", "#93c4a0"),
            "warning": ("#76510f", "#d9b26a"),
        },
        "type": [
            ("display", "Display", "'Cormorant Garamond', Didot, 'Bodoni 72', Georgia, serif", 500, 60, 64, -0.01, "The one line on a hero image."),
            ("title", "Headings", "'Cormorant Garamond', Didot, 'Bodoni 72', Georgia, serif", 500, 36, 44, 0, "The page title."),
            ("heading", "Headings", "'Cormorant Garamond', Didot, 'Bodoni 72', Georgia, serif", 600, 24, 32, 0, "Section headings."),
            ("body", "Text", "Jost, Futura, 'Century Gothic', 'Avenir Next', sans-serif", 400, 16, 28, 0.01, "Everything people read."),
            ("eyebrow", "Text", "Jost, Futura, 'Century Gothic', 'Avenir Next', sans-serif", 500, 11, 16, 0.18, "Small capitals above a title, buttons and menus."),
            ("caption", "Text", "Jost, Futura, 'Century Gothic', 'Avenir Next', sans-serif", 400, 13, 20, 0.02, "Captions and small print."),
            ("code", "Code", MONO, 400, 13, 20, 0, "Booking references."),
        ],
        "spacing": [("space-1", 4, "Between an icon and its label."), ("space-2", 8, "Between related controls."), ("space-4", 16, "Between a label and its line."), ("space-6", 24, "Padding of a card."), ("space-12", 48, "Between groups."), ("space-24", 96, "Between sections; space is the luxury.")],
        "radius": [("radius-none", 0, "Buttons, fields, cards and images."), ("radius-sm", 2, "Tags and checkboxes."), ("radius-full", 9999, "Avatars only.")],
        "shadows": [
            ("shadow-sm", [(0, 1, 2, 0, "#1412100d")], [(0, 1, 2, 0, "#00000059")], "Almost nothing: cards on ivory."),
            ("shadow-lg", [(0, 24, 60, -20, "#1412101f")], [(0, 24, 60, -20, "#000000b3")], "Dialogs and the booking panel."),
            ("shadow-md", [(0, 8, 24, -12, "#14121014")], [(0, 8, 24, -12, "#00000099")], "Menus and the floating reserve bar."),
        ],
        "opacity": [("opacity-disabled", 0.4, "A control that cannot be used yet."), ("opacity-veil", 0.35, "The dark veil over a hero image so its line reads."), ("opacity-overlay", 0.7, "The dim behind a dialog.")],
        "motion": [("motion-base", 240, "ease-out", "Hover and focus; slower than usual on purpose."), ("motion-slow", 420, "cubic-bezier(0.22, 0.61, 0.36, 1)", "Panels, images and pages fading in."), ("motion-reveal", 700, "cubic-bezier(0.22, 0.61, 0.36, 1)", "A hero image settling in once, on arrival.")],
        "ui": {"font": "Jost, Futura, 'Century Gothic', 'Avenir Next', sans-serif", "h": 44, "pad": 28, "weight": 500, "fs": 11, "case": "uppercase", "track": 0.18, "bw": 1, "card_r": "0px", "pill": "0px", "radius": "0px", "heading_font": "'Cormorant Garamond', Didot, 'Bodoni 72', Georgia, serif"},
    },
]

# ── Component samples: plain HTML + inline <style>, colours only from the token variables. ───────


def css_vars(ui: dict) -> str:
    """The sample's own non-colour knobs (font stack, sizes), set on a wrapper class."""
    r = ui.get("radius", "var(--radius)")
    btn_r = ui.get("btn_r", r)
    return (
        f".w{{font-family:{ui['font']};}}"
        f".b{{font:inherit;font-family:{ui['font']};font-size:{ui['fs']}px;font-weight:{ui['weight']};line-height:1;height:{ui['h']}px;padding:0 {ui['pad']}px;"
        f"border-radius:{btn_r};border:{ui['bw']}px solid transparent;cursor:pointer;text-transform:{ui['case']};letter-spacing:{ui['track']}em;"
        f"transition:filter var(--motion-fast, 120ms ease-out),transform var(--motion-fast, 120ms ease-out);"
        + (f"box-shadow:{ui['shadow']};" if ui.get("shadow") else "")
        + "}"
    )


def samples(s: dict) -> list[tuple[str, str, str, str]]:
    ui = s["ui"]
    r = ui.get("radius", "var(--radius)")
    hf = ui.get("heading_font", ui["font"])
    fs = ui.get("body_fs", 14)
    ring = "box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--ring)"
    base = css_vars(ui)
    out: list[tuple[str, str, str, str]] = []
    out.append((
        "Button", "Actions",
        f"<style>{base}.r{{display:flex;flex-wrap:wrap;gap:8px;align-items:center}}.p{{background:var(--primary);color:var(--primary-foreground)}}.p.h{{filter:brightness(1.08)}}.p.f{{{ring}}}.p:disabled{{opacity:var(--opacity-disabled, .5);cursor:not-allowed}}</style>"
        "<div class=\"w r\"><button class=\"b p\">Save</button><button class=\"b p h\">Hover</button><button class=\"b p f\">Focus</button><button class=\"b p\" disabled>Disabled</button></div>",
        "The one main action of a screen. Never two primary buttons side by side.",
    ))
    if not s.get("floor"):
        out.append((
            "Button variants", "Actions",
            f"<style>{base}.r{{display:flex;flex-wrap:wrap;gap:8px;align-items:center}}.s{{background:var(--secondary);color:var(--secondary-foreground)}}.o{{background:transparent;color:var(--foreground);border-color:var(--border)}}.q{{background:transparent;color:var(--muted-foreground);box-shadow:none}}.d{{background:var(--destructive);color:var(--destructive-foreground)}}</style>"
            "<div class=\"w r\"><button class=\"b s\">Secondary</button><button class=\"b o\">Outline</button><button class=\"b q\">Quiet</button><button class=\"b d\">Delete</button></div>",
            "Outline and quiet for everything else; delete only for what cannot be undone.",
        ))
    out.append((
        "Text field", "Inputs",
        f"<style>.w{{font-family:{ui['font']}}}.g{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}}.f{{display:grid;gap:6px;max-width:320px}}.l{{font-size:{max(12, fs - 2)}px;font-weight:600;color:var(--foreground)}}"
        f".i{{font:inherit;font-size:{fs}px;height:{max(34, ui['h'])}px;padding:0 12px;border-radius:{r};border:{ui['bw']}px solid var(--input);background:var(--background);color:var(--foreground);transition:box-shadow var(--motion-fast, 120ms ease-out)}}"
        f".i:focus,.i.f{{outline:none;border-color:var(--ring);{ring}}}.h{{font-size:{max(12, fs - 2)}px;color:var(--muted-foreground)}}.e .i{{border-color:var(--destructive)}}.e .h{{color:var(--destructive)}}</style>"
        "<div class=\"w g\"><label class=\"f\"><span class=\"l\">Email</span><input class=\"i\" placeholder=\"name@company.com\"><span class=\"h\">We send the receipt here.</span></label>"
        "<label class=\"f\"><span class=\"l\">Name</span><input class=\"i f\" value=\"Dana Ruiz\"><span class=\"h\">Focused.</span></label>"
        "<label class=\"f e\"><span class=\"l\">Phone</span><input class=\"i\" value=\"555-01\"><span class=\"h\">Enter all ten digits.</span></label></div>",
        "Every field has a visible label above it and a hint or error below.",
    ))
    out.append((
        "Card", "Containers",
        f"<style>{base}.c{{max-width:380px;padding:{20 if ui['h'] >= 40 else 16}px;border-radius:{ui['card_r']};border:{ui['bw']}px solid var(--border);background:var(--card);color:var(--card-foreground);box-shadow:{ui.get('card_shadow', 'var(--shadow-sm, none)')}}}"
        f".k{{margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground)}}.t{{margin:0 0 4px;font-family:{hf};font-size:{18 if hf != ui['font'] else 16}px;font-weight:600}}.m{{margin:0 0 14px;font-size:{fs - 1}px;color:var(--muted-foreground)}}.a{{display:flex;gap:8px}}.p{{background:var(--primary);color:var(--primary-foreground)}}.o{{background:transparent;color:var(--card-foreground);border-color:var(--border);box-shadow:none}}</style>"
        "<div class=\"w c\"><p class=\"k\">Report</p><h3 class=\"t\">Quarterly summary</h3><p class=\"m\">Updated 2 hours ago by Dana Ruiz</p><div class=\"a\"><button class=\"b p\">Open</button><button class=\"b o\">Share</button></div></div>",
        "One idea per card: a kicker, a title, one line of detail and at most two actions.",
    ))
    out.append((
        "Badge", "Status",
        f"<style>.w{{font-family:{ui['font']}}}.r{{display:flex;flex-wrap:wrap;gap:8px}}.x{{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:{ui['pill']};font-size:12px;font-weight:600;border:1px solid var(--border);color:var(--foreground);background:var(--muted)}}"
        ".x i{width:7px;height:7px;border-radius:50%;background:currentColor}.ok{color:var(--success)}.wa{color:var(--warning)}.er{color:var(--destructive)}.pr{background:var(--primary);color:var(--primary-foreground);border-color:transparent}</style>"
        "<div class=\"w r\"><span class=\"x\">Draft</span><span class=\"x pr\">New</span><span class=\"x ok\"><i></i>Live</span><span class=\"x wa\"><i></i>Waiting</span><span class=\"x er\"><i></i>Failed</span></div>",
        "A status always pairs its colour with a word.",
    ))
    th = 22 if ui["h"] < 40 else 26
    tw = th + 14
    out.append((
        "Toggle list", "Selection",
        f"<style>.w{{font-family:{ui['font']}}}.l{{display:grid;max-width:440px;border:{ui['bw']}px solid var(--border);border-radius:{ui['card_r']};background:var(--card)}}.o{{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;font-size:{fs}px;color:var(--card-foreground)}}.o+.o{{border-top:1px solid var(--border)}}"
        f".o small{{display:block;font-size:{max(12, fs - 2)}px;color:var(--muted-foreground)}}.t{{appearance:none;flex:none;width:{tw}px;height:{th}px;border-radius:var(--radius-full, 999px);background:var(--input);position:relative;cursor:pointer;margin:0;transition:background var(--motion-fast, 120ms ease-out)}}"
        f".t::after{{content:\"\";position:absolute;top:3px;left:3px;width:{th - 6}px;height:{th - 6}px;border-radius:50%;background:var(--background);transition:transform var(--motion-fast, 120ms ease-out)}}.t:checked{{background:var(--primary)}}.t:checked::after{{transform:translateX({tw - th}px)}}.t:disabled{{opacity:var(--opacity-disabled, .5);cursor:not-allowed}}</style>"
        "<div class=\"w l\"><label class=\"o\"><span>Email alerts<small>When a task is assigned to you</small></span><input type=\"checkbox\" class=\"t\" checked></label>"
        "<label class=\"o\"><span>Weekly digest<small>Every Monday morning</small></span><input type=\"checkbox\" class=\"t\"></label>"
        "<label class=\"o\"><span>Text messages<small>Needs a verified phone</small></span><input type=\"checkbox\" class=\"t\" disabled></label></div>",
        "A switch acts at once. When a choice needs a Save, use a checkbox.",
    ))
    out.append((
        "Collapsible list", "Disclosure",
        f"<style>.w{{font-family:{ui['font']}}}.d{{max-width:500px;border:{ui['bw']}px solid var(--border);border-radius:{ui['card_r']};background:var(--card);color:var(--card-foreground)}}details+details{{border-top:1px solid var(--border)}}"
        f"summary{{list-style:none;cursor:pointer;padding:12px 16px;font-size:{fs}px;font-weight:600;display:flex;justify-content:space-between;gap:12px}}summary::-webkit-details-marker{{display:none}}summary::after{{content:\"+\";color:var(--muted-foreground)}}details[open] summary::after{{content:\"\\2212\"}}"
        f"p{{margin:0;padding:0 16px 14px;font-size:{fs - 1}px;color:var(--muted-foreground)}}</style>"
        "<div class=\"w d\"><details open><summary>What is included</summary><p>Every table, view and page in the template.</p></details><details><summary>Who can see it</summary><p>Everyone in your organization.</p></details><details><summary>Can I undo it</summary><p>Yes, from the history of each item.</p></details></div>",
        "For answers people look up once. Never hide a step people must take.",
    ))
    if not s.get("floor"):
        out.append((
            "Tabs", "Disclosure",
            f"<style>.w{{font-family:{ui['font']}}}.t{{display:flex;gap:4px;border-bottom:1px solid var(--border)}}.t span{{padding:10px 14px;font-size:{fs}px;color:var(--muted-foreground);border-bottom:2px solid transparent;margin-bottom:-1px;text-transform:{ui['case']};letter-spacing:{ui['track']}em}}.t .on{{color:var(--foreground);font-weight:600;border-color:var(--primary)}}</style>"
            "<div class=\"w t\"><span class=\"on\">Overview</span><span>Activity</span><span>Settings</span></div>",
            "Tabs switch views of one thing. Three to five, short names.",
        ))
    if ui.get("mono"):
        out.append((
            "Code and keys", "Status",
            f"<style>.w{{font-family:{ui['font']};font-size:13px;color:var(--foreground)}}.c{{font-family:{ui['mono']};font-size:12.5px;padding:10px 12px;border-radius:var(--radius);background:var(--muted);color:var(--foreground);border:1px solid var(--border);margin:0 0 10px;white-space:pre-wrap}}.c b{{color:var(--success);font-weight:400}}.k{{font-family:{ui['mono']};font-size:11px;padding:1px 6px;border-radius:var(--radius-sm, 3px);border:1px solid var(--border);border-bottom-width:2px;background:var(--card);color:var(--muted-foreground)}}</style>"
            "<div class=\"w\"><pre class=\"c\"><b>$</b> pipeline run nightly --env prod\n✓ 14 steps · 2m 18s</pre>Open the palette with <span class=\"k\">⌘</span> <span class=\"k\">K</span></div>",
            "Mono for anything a person copies or types: commands, ids, keys.",
        ))
    return out


# ── Pack assembly ─────────────────────────────────────────────────────────────────────────────────

FIELD = {"sensitivity": "internal", "contextPolicy": "include"}
COLOR_GROUPS = {"Surfaces": "slate", "Muted": "gray", "Primary": "blue", "Secondary": "violet", "Accent": "amber", "Lines": "teal", "Feedback": "red"}


def f(key: str, label: str, ptype: str, **extra) -> dict:
    return {"key": key, "label": label, "parityType": ptype, **FIELD, **extra}


def table(token: str, name: str, single: str, plural: str, icon: str, describes: str, fields: list, rows: list) -> dict:
    return {"token": token, "name": name, "labelSingular": single, "labelPlural": plural, "type": "entity", "display": "grid", "weight": "light", "ordered": True, "icon": icon, "titleField": "name", "describes": describes, "subject": "thing", "fields": fields, "rows": rows}


def jd(v) -> str:
    return json.dumps(v, separators=(",", ":"))


def layers(ls):
    out = [{"x": x, "y": y, "blur": b, "spread": sp, "color": c} for (x, y, b, sp, c) in ls]
    return out[0] if len(out) == 1 else {"layers": out}


def color_roles(s: dict):
    return [r for r in ROLES if not (s.get("floor") and r[0] in FLOOR_SKIP)]


def contrast_rows(s: dict) -> list[tuple[str, str, str, float, float, float]]:
    """(ink, ground, kind, light ratio, dark ratio, needed) for every pair the starter promises."""
    c = s["colors"]
    out = []
    for name, _g, on, _n in color_roles(s):
        if on:
            out.append((name, on, "reads_on"))
        for g in ALSO_TEXT_ON.get(name, []):
            out.append((name, g, "also text"))
        for g in NON_TEXT_ON.get(name, []):
            out.append((name, g, "non-text"))
    rows = []
    for ink, ground, kind in out:
        need = 3.0 if kind == "non-text" else 4.5
        rows.append((ink, ground, kind, ratio(c[ink][0], c[ground][0]), ratio(c[ink][1], c[ground][1]), need))
    return rows


def overview(s: dict) -> str:
    p = s["profile"]
    lines = [f"Design system — {s['name']}", "", "## Principles"] + [f"- {x}" for x in s["principles"]]
    lines += ["", "## Starter profile"] + [f"- **{k}:** {v}" for k, v in p.items()]
    lines += [
        "",
        "## Using tokens",
        "Use a token by its name, never its value. Change a value here and every screen and component sample follows. Each colour shows its light and dark values and is checked against the colour it is read on.",
        "",
        "## Making it yours",
        "This is a starter. Change the primary colour and the fonts to your brand first, then the corners and spacing. Keep every text colour at 4.5:1 or more on what it sits on, in light and dark.",
        "",
        "## Accessibility",
        "Text reaches 4.5:1 against what it sits on; large text and icons 3:1. Focus is always visible. Nothing is told by colour alone.",
        "",
    ]
    return "\n".join(lines)


def build(s: dict) -> dict:
    c = s["colors"]
    color_rows = []
    for i, (name, group, on, note) in enumerate(color_roles(s), 1):
        v = {"name": name, "group": group, "value": jd({"light": c[name][0], "dark": c[name][1]}), "usage_note": note}
        if on:
            v["reads_on"] = on
        color_rows.append({"key": f"col-{i:02d}", "values": v})
    groups_used = list(dict.fromkeys(r[1] for r in color_roles(s)))
    type_rows = [
        {"key": f"typ-{i:02d}", "values": {"name": n, "group": g, "style": jd({"font": fo, "weight": w, "size": sz, "lineHeight": lh, "letterSpacing": ls}), "usage_note": note}}
        for i, (n, g, fo, w, sz, lh, ls, note) in enumerate(s["type"], 1)
    ]
    type_groups = list(dict.fromkeys(t[1] for t in s["type"]))
    spacing_rows = [{"key": f"spc-{i:02d}", "values": {"name": n, "value": v, "usage_note": note}} for i, (n, v, note) in enumerate(s["spacing"], 1)]
    radius_rows = [{"key": f"rad-{i:02d}", "values": {"name": n, "value": v, "usage_note": note}} for i, (n, v, note) in enumerate(s["radius"], 1)]
    shadow_rows = [{"key": f"shd-{i:02d}", "values": {"name": n, "value": jd({"light": layers(lt), "dark": layers(dk)}), "usage_note": note}} for i, (n, lt, dk, note) in enumerate(s["shadows"], 1)]
    opacity_rows = [{"key": f"opa-{i:02d}", "values": {"name": n, "value": v, "usage_note": note}} for i, (n, v, note) in enumerate(s["opacity"], 1)]
    motion_rows = [{"key": f"mot-{i:02d}", "values": {"name": n, "value": jd({"duration": d, "easing": e}), "usage_note": note}} for i, (n, d, e, note) in enumerate(s["motion"], 1)]
    comp = samples(s)
    comp_groups = list(dict.fromkeys(x[1] for x in comp))
    comp_rows = [{"key": f"cmp-{i:02d}", "values": {"name": n, "group": g, "sample": html, "usage_note": note}} for i, (n, g, html, note) in enumerate(comp, 1)]
    cg = {"Actions": "blue", "Inputs": "teal", "Containers": "slate", "Status": "amber", "Selection": "violet", "Disclosure": "gray"}
    tg = {"Display": "violet", "Headings": "blue", "Text": "slate", "Code": "amber"}
    name_f = f("name", "Name", "text", required=True)
    note_f = f("usage_note", "Usage note", "text")
    tables = [
        table("color", "Colors", "Colour", "Colours", "palette", "Every colour the product uses, light and dark, and what each is read on.",
              [name_f, f("group", "Group", "select", choices=groups_used, choiceColors={g: COLOR_GROUPS[g] for g in groups_used}),
               f("value", "Value", "text", look={"id": "color_pair", "options": {"contrastWith": {"readsOnField": "reads_on"}}}),
               f("reads_on", "Read on", "text"), note_f], color_rows),
        table("type_style", "Typography", "Text style", "Text styles", "type", "The text styles: font, weight, size, line height and spacing.",
              [name_f, f("group", "Group", "select", choices=type_groups, choiceColors={g: tg[g] for g in type_groups}), f("style", "Style", "text", look={"id": "type_style"}), note_f], type_rows),
        table("spacing", "Spacing", "Spacing value", "Spacing values", "ruler", "The spacing scale every layout is built from.",
              [name_f, f("value", "Value", "number", rules=[{"kind": "min", "value": 0}, {"kind": "max", "value": 256}], look={"id": "measure", "options": {"unit": "px", "measurePreview": "spacing"}}), note_f], spacing_rows),
        table("radius", "Corner radius", "Radius", "Radii", "square", "How round corners are, from chips to avatars.",
              [name_f, f("value", "Value", "number", rules=[{"kind": "min", "value": 0}, {"kind": "max", "value": 9999}], look={"id": "measure", "options": {"unit": "px", "measurePreview": "radius"}}), note_f], radius_rows),
        table("shadow", "Shadows", "Shadow", "Shadows", "layers", "Elevation: how far something floats above the page, in light and dark.",
              [name_f, f("value", "Value", "text", look={"id": "shadow"}), note_f], shadow_rows),
        table("opacity", "Opacity", "Opacity", "Opacities", "droplet", "How see-through things get: disabled controls, tints and overlays.",
              [name_f, f("value", "Value", "number", rules=[{"kind": "min", "value": 0}, {"kind": "max", "value": 1}], look={"id": "opacity"}), note_f], opacity_rows),
        table("motion", "Motion", "Motion", "Motions", "zap", "How fast things move and how they ease in and out.",
              [name_f, f("value", "Value", "text", look={"id": "motion"}), note_f], motion_rows),
        table("component", "Components", "Component", "Components", "component", "Each component family, drawn as it looks in light and dark, with where to use it.",
              [name_f, f("group", "Group", "select", choices=comp_groups, choiceColors={g: cg[g] for g in comp_groups}), f("sample", "Sample", "text", look={"id": "html_sample"}), note_f], comp_rows),
    ]
    views = [{"token": f"all_{t}", "name": n, "table": t, "kind": "grid", "isDefault": True} for t, n in [("color", "All colours"), ("type_style", "All text styles"), ("spacing", "All spacing values"), ("radius", "All radii"), ("shadow", "All shadows"), ("opacity", "All opacities"), ("motion", "All motions"), ("component", "All components")]]
    surfaces = sum(1 for r in color_roles(s) if r[1] == "Surfaces")
    st = s["studio"]
    first = s["person"].replace("Dr. ", "").split()[0]

    def sec(title, token, h):
        return {"title": title, "tiles": [{"kind": "table", "title": title, "table": token, "layout": "section", "size": {"w": 1020, "h": h}}]}

    n_comp = len(comp_rows)
    board = {
        "key": f"design-system-{s['slug']}",
        "title": f"Design system — {s['name']}",
        "layout": "page",
        "chapters": [
            {"title": "Overview", "tiles": [{"kind": "note", "title": f"Design system — {s['name']}", "text": overview(s), "size": {"w": 1020, "h": 820}}]},
            sec("Colors", "color", 120 + 80 * len(color_rows)),
            sec("Typography", "type_style", 160 + 100 * len(type_rows)),
            sec("Spacing", "spacing", 160 + 64 * len(spacing_rows)),
            sec("Corner radius", "radius", 200 + 64 * len(radius_rows)),
            sec("Shadows", "shadow", 220 + 70 * len(shadow_rows)),
            sec("Opacity", "opacity", 160 + 64 * len(opacity_rows)),
            sec("Motion", "motion", 160 + 64 * len(motion_rows)),
            sec("Components", "component", 200 + 150 * n_comp),
            {"title": "Assets", "tiles": [{"kind": "note", "title": "Assets", "text": "Assets\n\nKeep the logo files, icon set and brand photography here, or on the Files page. Name each file for what it is and where it is used.\n", "size": {"w": 1020, "h": 280}}]},
        ],
        "pages": [{"key": "files", "title": "Files", "layout": "page", "chapters": [{"title": "Files", "tiles": [{"kind": "writeUp", "title": "Files", "text": "Drop logo files, icon sets and exports on this page. Each file becomes a tile you can open and share.", "size": {"w": 1020, "h": 200}}]}]}],
    }
    spec = {
        "specVersion": 1,
        "id": f"spaces-design-starter-{s['slug']}",
        "catalogueId": s["id"],
        "useCase": f"{s['person']} starts {st[0]}'s design system from the {s['name']} starter and adapts it to the brand.",
        "industry": "cross_industry",
        "vertical": s["vertical"],
        "job": "content",
        "audience": "organization",
        "teaches": "tables",
        "strengths": [],
        "requires": [],
        "business": {"name": st[0], "describes": st[1], "address": {"line1": f"{(int(s['id'][2:]) % 90) + 10} {st[3]}", "city": st[4], "region": st[5], "postalCode": st[6], "country": "US"}, "phone": st[7], "website": st[2], "email": f"hello@{st[2]}", "timezone": st[8]},
        "cleanupTag": f"use-case:spaces-design-starter-{s['slug']}",
        "tables": tables,
        "relationships": [],
        "sharedBlocks": [],
        "forms": [{"token": "color_request", "name": "Propose a colour", "describes": "Suggest a new colour for the system.", "audience": "staff", "table": "color",
                   "fields": [{"fieldKey": "name", "ask": "What is the colour called?", "required": True}, {"fieldKey": "group", "ask": "Which group does it belong to?"}, {"fieldKey": "usage_note", "ask": "Where would it be used?"}],
                   "submitLabel": "Send proposal", "confirmation": "Thanks. It is in the Colors section."}],
        "dimensions": [],
        "extras": [],
        "views": views,
        "agent": {
            "platformAgent": {"id": "4cd676c6-f55d-4426-b7eb-a9d0273566ec", "name": "Answers From Your Tables"},
            "name": "Design system assistant",
            "variables": [{"name": "primary_table", "table": "color", "describes": "Every colour, its light and dark values and what it is read on."}, {"name": "related_tables", "table": "type_style", "describes": "The text styles."}],
            "question": {"ask": "How many colours are in the Surfaces group?", "whyItMatters": f"{first} keeps the surfaces to a handful so screens stay calm.",
                         "expect": {"table": "color", "measure": {"op": "count"}, "filter": {"group": "Surfaces"}, "answer": surfaces, "unit": "colours"}},
        },
        "walk": [
            {"says": "Open Colors.", "action": {"kind": "open", "surface": "all_color"}, "expect": {"kind": "renders", "surface": "all_color", "minItems": 3}},
            {"says": "Open Typography.", "action": {"kind": "open", "surface": "all_type_style"}, "expect": {"kind": "renders", "surface": "all_type_style", "minItems": 3}},
            {"says": "Open Components.", "action": {"kind": "open", "surface": "all_component"}, "expect": {"kind": "renders", "surface": "all_component", "minItems": 3}},
        ],
        "foundation": [],
        "provenance": {"kind": "synthesized", "authoredBy": "Board template author (Claude)", "authoredOn": TODAY, "noRealPeople": True, "sources": [], "fictionalDomains": [st[2]], "fictionalStreets": [st[3]]},
        "version": VERSION,
    }
    return {
        "packVersion": 1, "catalogueId": s["id"], "version": VERSION,
        "title": f"Design system — {s['name']}", "description": s["description"], "forWho": s["forWho"],
        "icon": {"icon": "Palette"}, "cover": None, "category": "docs", "tags": s["tags"],
        "spec": spec, "pages": [], "board": board,
    }


def main() -> int:
    check_only = "--check" in sys.argv
    bad = 0
    print("| Starter | Ink | Ground | Kind | Light | Dark | Needs |\n|---|---|---|---|---|---|---|")
    for s in STARTERS:
        for ink, ground, kind, lr, dr, need in contrast_rows(s):
            flag = "" if lr >= need and dr >= need else " FAIL"
            bad += bool(flag)
            print(f"| {s['name']} | {ink} | {ground} | {kind} | {lr} | {dr} | {need}{flag} |")
    if bad:
        print(f"\n{bad} pair(s) below their bar; nothing written.", file=sys.stderr)
        return 1
    if check_only:
        return 0
    for s in STARTERS:
        p = PACKS / f"design-starter-{s['slug']}.pack.json"
        p.write_text(json.dumps(build(s), indent=2, ensure_ascii=False) + "\n")
        print("wrote", p.relative_to(HERE.parent.parent.parent))
    return 0


if __name__ == "__main__":
    sys.exit(main())
