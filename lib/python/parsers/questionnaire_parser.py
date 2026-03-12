"""Questionnaire parser — port of parser-separated.ts (separatedMarkdownParser)."""

from __future__ import annotations

import json
import re
from typing import Any

from lib.python.models.questionnaire import QuestionnaireBlockData, QuestionnaireSection

_HEADING_RE = re.compile(r'^#{1,3}\s+')
_BOLD_HEADING_RE = re.compile(r'^\*\*[^*]+\*\*$')
_DIVIDER_RE = re.compile(r'^(?:={3,}|-{3,}|\*{3,}|_{3,})$')
_LIST_ITEM_RE = re.compile(r'^[*\-]\s+|^\d+\.\s+')
_LIST_EXTRACT_RE = re.compile(r'^([*\-]|\d+\.)\s+(.*)')
_BOLD_RE = re.compile(r'\*\*(.*?)\*\*')


def _extract_bold(text: str) -> str:
    return _BOLD_RE.sub(r'\1', text)


def _is_list_item(line: str) -> bool:
    return bool(_LIST_ITEM_RE.match(line.strip()))


def _parse_list_block(lines: list[str], start: int) -> tuple[list[dict[str, Any]], int]:
    """Parse a list block with nesting. Returns (items, lines_consumed)."""
    items: list[dict[str, Any]] = []
    stack: list[dict[str, Any]] = [{"indent": 0, "list": items}]
    i = start

    while i < len(lines):
        raw = lines[i]
        if not raw.strip():
            i += 1
            continue
        if not _is_list_item(raw):
            break

        leading = len(raw) - len(raw.lstrip(' '))
        trimmed = raw.strip()
        m = _LIST_EXTRACT_RE.match(trimmed)
        if not m:
            break
        text = m.group(2)

        while leading < stack[-1]["indent"]:
            stack.pop()

        if leading > stack[-1]["indent"]:
            parent_list = stack[-1]["list"]
            if parent_list:
                parent_item = parent_list[-1]
                if "children" not in parent_item:
                    parent_item["children"] = []
                stack.append({"indent": leading, "list": parent_item["children"]})
            else:
                stack[-1]["list"].append({"name": _extract_bold(text), "children": []})
                i += 1
                continue

        stack[-1]["list"].append({"name": _extract_bold(text)})
        i += 1

    return items, i - start


def parse_questionnaire(content: str) -> QuestionnaireBlockData | None:
    """Parse questionnaire markdown into structured sections."""
    try:
        lines = content.split("\n")
        intro = ""
        sections: list[QuestionnaireSection] = []
        outro = ""
        current: QuestionnaireSection | None = None
        has_seen_first_item = False
        collecting_intro = True
        collecting_outro = False
        in_code_block = False
        code_lines: list[str] = []
        code_lang = "plaintext"

        def finalize_section() -> None:
            nonlocal current, has_seen_first_item
            if current and (current.content or current.items or current.tables
                           or current.code_blocks or current.json_blocks):
                sections.append(current)
            current = None
            has_seen_first_item = False

        i = 0
        while i < len(lines):
            raw = lines[i]
            trimmed = raw.strip()

            # Code block toggle
            if trimmed.startswith("```"):
                if in_code_block:
                    code_content = "\n".join(code_lines)
                    if current is None:
                        current = QuestionnaireSection(title="Code Block")
                    current.code_blocks.append({"language": code_lang, "content": code_content})
                    if code_lang.lower() == "json":
                        try:
                            current.json_blocks.append(json.loads(code_content))
                        except json.JSONDecodeError as e:
                            current.json_blocks.append({"parseError": str(e)})
                    in_code_block = False
                    code_lines = []
                    code_lang = "plaintext"
                else:
                    in_code_block = True
                    code_lang = trimmed[3:].strip() or "plaintext"
                i += 1
                continue

            if in_code_block:
                code_lines.append(raw)
                i += 1
                continue

            # Divider
            if _DIVIDER_RE.match(trimmed):
                finalize_section()
                collecting_intro = False
                collecting_outro = False
                i += 1
                continue

            # Heading
            if _HEADING_RE.match(trimmed) or _BOLD_HEADING_RE.match(trimmed):
                finalize_section()
                collecting_intro = False
                collecting_outro = False
                heading = trimmed
                if _HEADING_RE.match(trimmed):
                    heading = _HEADING_RE.sub('', heading)
                else:
                    heading = re.sub(r'^\*\*(.*)\*\*$', r'\1', heading)
                current = QuestionnaireSection(title=_extract_bold(heading))
                i += 1
                continue

            # Table
            if trimmed.startswith("|") and current is not None:
                table_lines: list[str] = []
                j = i
                while j < len(lines) and lines[j].strip().startswith("|"):
                    table_lines.append(lines[j])
                    j += 1
                from lib.python.parsers.table_parser import parse_table
                table_data = parse_table("\n".join(table_lines))
                if table_data:
                    current.tables.append({
                        "title": current.title,
                        "data": table_data.model_dump(),
                    })
                i = j
                continue

            # List item
            if _is_list_item(raw):
                if current is None:
                    parsed_items, consumed = _parse_list_block(lines, i)
                    text_parts = [item["name"] for item in parsed_items]
                    if collecting_intro:
                        intro += ("\n" if intro else "") + "\n".join(text_parts)
                    elif collecting_outro:
                        outro += ("\n" if outro else "") + "\n".join(text_parts)
                    i += consumed
                    continue
                else:
                    parsed_items, consumed = _parse_list_block(lines, i)
                    current.items.extend(parsed_items)
                    has_seen_first_item = True
                    i += consumed
                    continue

            # Plain text
            if current is None:
                if collecting_intro:
                    if trimmed:
                        intro += ("\n" if intro else "") + _extract_bold(trimmed)
                else:
                    collecting_outro = True
                    if trimmed:
                        outro += ("\n" if outro else "") + _extract_bold(trimmed)
            else:
                if not has_seen_first_item:
                    if trimmed:
                        current.content += (" " if current.content else "") + _extract_bold(trimmed)
                else:
                    pass  # Post-items text — could extend model if needed

            i += 1

        finalize_section()

        return QuestionnaireBlockData(
            sections=sections,
            raw_content=content,
        )
    except Exception:
        return None
