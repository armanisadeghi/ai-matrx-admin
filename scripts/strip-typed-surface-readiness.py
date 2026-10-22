"""Remove `readiness:` / `readinessNote:` properties from surface manifest object literals.

Usage: python3 strip_readiness.py FILE...   (prints a summary; edits in place)
Only removes lines whose property key is exactly `readiness` or `readinessNote` and whose
value is a string literal (single-line, concatenated over several lines, or a template).
"""
import re
import sys

KEY = re.compile(r"^(\s*)(readiness|readinessNote)\s*:\s*(.*)$")


def string_closed(text: str) -> bool:
    """True when `text` (the value so far) ends a complete property value: a closing quote then `,`."""
    t = text.rstrip()
    if not t:
        return False
    if t.endswith("+"):
        return False
    return bool(re.search(r"""(["'`])\s*,?\s*(//.*)?$""", t)) and t.endswith((",", '"', "'", "`"))


def strip(src: str) -> tuple[str, int, list[str]]:
    lines = src.split("\n")
    out: list[str] = []
    removed = 0
    odd: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m = KEY.match(line)
        if not m:
            out.append(line)
            i += 1
            continue
        key, rest = m.group(2), m.group(3)
        if key == "readiness" and not re.match(r"""^["'](verified|partial|stub)["']\s*(as const)?\s*,?\s*(//.*)?$""", rest):
            odd.append(f"{i + 1}: {line.strip()[:120]}")
            out.append(line)
            i += 1
            continue
        # Only a string-literal value (on this line, or starting on the next) is stripped;
        # a type annotation (`readinessNote: string;`) or an expression (`args.readinessNote`)
        # is left in place and reported, never swallowed with the lines after it.
        nxt = lines[i + 1].lstrip() if i + 1 < len(lines) else ""
        if not (rest[:1] in "\"'`" and rest) and not (rest.strip() == "" and nxt[:1] in "\"'`/"):
            odd.append(f"{i + 1}: {line.strip()[:120]}")
            out.append(line)
            i += 1
            continue
        j = i
        if rest.startswith("`"):
            # template literal: until a line containing the closing backtick followed by , or end
            body = rest[1:]
            while "`" not in body:
                j += 1
                body = lines[j]
        elif rest.strip() == "":
            j += 1
            while not string_closed(lines[j]):
                j += 1
        else:
            while not string_closed(lines[j] if j > i else rest):
                j += 1
        removed += j - i + 1
        i = j + 1
    return "\n".join(out), removed, odd


if __name__ == "__main__":
    total = 0
    for path in sys.argv[1:]:
        src = open(path).read()
        new, n, odd = strip(src)
        for o in odd:
            print(f"ODD {path}:{o}")
        if n:
            open(path, "w").write(new)
            total += n
    print(f"removed {total} lines")
