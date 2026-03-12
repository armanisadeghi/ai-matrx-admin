"""
Block boundary detection — Python port of content-splitter-v2.ts.

Detects and extracts content blocks from raw markdown text.
Operates on complete text (used by StreamBlockProcessor after accumulation).

Detection priority (same as TypeScript):
1. MATRX patterns
2. Code blocks (with JSON special types)
3. XML tag blocks
4. Images
5. Videos
6. Tables
7. Text (fallback)
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class DetectedBlock:
    """A block detected by the splitter."""

    type: str
    content: str
    language: str | None = None
    src: str | None = None
    alt: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExtractionResult:
    content: str
    next_index: int
    metadata: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# MATRX pattern detection
# ---------------------------------------------------------------------------

MATRX_PATTERN = re.compile(r"<<<MATRX_START>>>(.*?)<<<MATRX_END>>>", re.DOTALL)

MATRX_FIELD_PATTERNS = {
    "matrx_record_id": re.compile(r"<MATRX_KEY>(.*?)<MATRX_KEY_END>", re.DOTALL),
    "id": re.compile(r"<ID>(.*?)<ID_END>", re.DOTALL),
    "name": re.compile(r"<NAME>(.*?)<NAME_END>", re.DOTALL),
    "default_value": re.compile(r"<DEFAULT_VALUE>(.*?)<DEFAULT_VALUE_END>", re.DOTALL),
    "status": re.compile(r"<STATUS>(.*?)<STATUS_END>", re.DOTALL),
    "color": re.compile(r"<COLOR>(.*?)<COLOR_END>", re.DOTALL),
    "default_component": re.compile(r"<COMPONENT>(.*?)<COMPONENT_END>", re.DOTALL),
    "data_type": re.compile(r"<DATA_TYPE>(.*?)<DATA_TYPE>", re.DOTALL),
}


def parse_matrx_metadata(content: str) -> dict[str, str]:
    """Parse MATRX metadata fields from inner content."""
    metadata: dict[str, str] = {}
    for key, pattern in MATRX_FIELD_PATTERNS.items():
        m = pattern.search(content)
        if m and m.group(1):
            metadata[key] = m.group(1)
    return metadata


def remove_matrx_pattern(text: str) -> str:
    """Remove MATRX patterns from a line."""
    cleaned = MATRX_PATTERN.sub("", text)
    return "" if cleaned.strip() == "" else cleaned


def detect_matrx_pattern(text: str) -> re.Match[str] | None:
    """Detect a MATRX pattern in the text."""
    return MATRX_PATTERN.search(text)


# ---------------------------------------------------------------------------
# JSON block detection
# ---------------------------------------------------------------------------

JSON_BLOCK_PATTERNS: dict[str, dict[str, Any]] = {
    "quiz": {
        "root_key": "quiz_title",
        "validate": lambda p: bool(
            p and p.get("quiz_title") and isinstance(p.get("multiple_choice"), list) and len(p["multiple_choice"]) > 0
        ),
    },
    "presentation": {
        "root_key": "presentation",
        "validate": lambda p: bool(
            p and p.get("presentation", {}).get("slides") and isinstance(p["presentation"]["slides"], list)
        ),
    },
    "decision_tree": {
        "root_key": "decision_tree",
        "validate": lambda p: bool(p and p.get("decision_tree", {}).get("title") and p["decision_tree"].get("root")),
    },
    "comparison_table": {
        "root_key": "comparison",
        "validate": lambda p: bool(
            p
            and p.get("comparison", {}).get("title")
            and isinstance(p.get("comparison", {}).get("items"), list)
            and isinstance(p.get("comparison", {}).get("criteria"), list)
        ),
    },
    "diagram": {
        "root_key": "diagram",
        "validate": lambda p: bool(
            p and p.get("diagram", {}).get("title") and isinstance(p.get("diagram", {}).get("nodes"), list)
        ),
    },
    "math_problem": {
        "root_key": "math_problem",
        "validate": lambda p: bool(p and isinstance(p.get("math_problem"), dict)),
    },
}

_FIRST_JSON_KEY_RE = re.compile(r'^\{\s*"([^"]+)"')


def _extract_first_json_key(content: str) -> str | None:
    m = _FIRST_JSON_KEY_RE.match(content.lstrip())
    return m.group(1) if m else None


def detect_json_block_type(content: str) -> str | None:
    first_key = _extract_first_json_key(content)
    if not first_key:
        return None
    for block_type, pattern in JSON_BLOCK_PATTERNS.items():
        if pattern["root_key"] == first_key:
            return block_type
    return None


_PLACEHOLDER_PATTERNS = [
    re.compile(r'\[\s*(array|object|string|number|boolean|description|example|etc|list|item)[^\]]*\]', re.IGNORECASE),
    re.compile(r':\s*"?\[?(array|list) of ', re.IGNORECASE),
    re.compile(r':\s*"?object with ', re.IGNORECASE),
    re.compile(r':\s*"?<[a-z_]+>', re.IGNORECASE),
    re.compile(r':\s*"?\.\.\."?'),
]


def _contains_placeholder_text(content: str) -> bool:
    return any(p.search(content) for p in _PLACEHOLDER_PATTERNS)


def validate_json_block(content: str, block_type: str) -> dict[str, Any]:
    """Validate a JSON block and determine its streaming state."""
    trimmed = re.sub(r'```+\s*$', '', content.strip()).strip()

    if _contains_placeholder_text(trimmed):
        return {"is_complete": False, "should_show": False}

    # Try full parse
    try:
        parsed = json.loads(trimmed)
        pattern = JSON_BLOCK_PATTERNS[block_type]
        if pattern["validate"](parsed):
            return {"is_complete": True, "should_show": True, "metadata": {"isComplete": True}}
        return {"is_complete": True, "should_show": False, "metadata": {"isComplete": True}}
    except (json.JSONDecodeError, KeyError):
        pass

    # Brace counting
    open_braces = trimmed.count("{")
    close_braces = trimmed.count("}")

    if open_braces > close_braces:
        return {"is_complete": False, "should_show": False}
    if trimmed.endswith("}") and open_braces == close_braces:
        return {"is_complete": True, "should_show": False, "metadata": {"isComplete": True}}
    if close_braces > open_braces:
        return {"is_complete": True, "should_show": False, "metadata": {"isComplete": True}}

    return {"is_complete": False, "should_show": False}


# ---------------------------------------------------------------------------
# XML tag block detection
# ---------------------------------------------------------------------------

XML_TAG_BLOCKS: dict[str, list[str]] = {
    "thinking": ["<thinking>", "<think>"],
    "reasoning": ["<reasoning>"],
    "info": ["<info>"],
    "task": ["<task>"],
    "database": ["<database>"],
    "private": ["<private>"],
    "plan": ["<plan>"],
    "event": ["<event>"],
    "tool": ["<tool>"],
    "questionnaire": ["<questionnaire>"],
    "flashcards": ["<flashcards>"],
    "cooking_recipe": ["<cooking_recipe>"],
    "timeline": ["<timeline>"],
    "progress_tracker": ["<progress_tracker>"],
    "troubleshooting": ["<troubleshooting>"],
    "resources": ["<resources>"],
    "research": ["<research>"],
}


def detect_xml_block_type(line: str) -> str | None:
    trimmed = line.strip()
    for block_type, tags in XML_TAG_BLOCKS.items():
        if trimmed in tags:
            return block_type
    return None


def extract_xml_block(block_type: str, start_index: int, lines: list[str]) -> ExtractionResult:
    content_lines: list[str] = []
    i = start_index
    found_closing = False

    opening_tag = XML_TAG_BLOCKS[block_type][0]
    tag_name = opening_tag[1:-1]
    closing_tag = f"</{tag_name}>"

    while i < len(lines):
        current = remove_matrx_pattern(lines[i]).strip()

        if current == closing_tag:
            found_closing = True
            i += 1
            break

        if block_type == "thinking" and current.startswith("### I have everything"):
            content_lines.append(lines[i])
            i += 1
            break

        content_lines.append(lines[i])
        i += 1

    full_content = "\n".join(content_lines)
    result = _validate_streaming_xml_block(block_type, full_content, found_closing)

    return ExtractionResult(
        content=result["content"] or full_content,
        next_index=i,
        metadata=result["metadata"],
    )


def _validate_streaming_xml_block(block_type: str, content: str, found_closing: bool) -> dict[str, Any]:
    if block_type not in ("questionnaire", "flashcards", "cooking_recipe"):
        return {"content": content, "metadata": {"isComplete": found_closing}}

    if block_type == "questionnaire":
        return _validate_questionnaire_streaming(content, found_closing)
    if block_type == "flashcards":
        return _validate_flashcard_streaming(content, found_closing)
    if block_type == "cooking_recipe":
        return _validate_recipe_streaming(content, found_closing)

    return {"content": content, "metadata": {"isComplete": found_closing}}


def _validate_questionnaire_streaming(content: str, found_closing: bool) -> dict[str, Any]:
    lines = content.split("\n")
    complete_questions: list[str] = []
    current_question: list[str] = []
    total_questions = 0

    question_re = re.compile(r'^###\s+\*\*Q\d+:|^###\s+Q\d+:|^\*\*Q\d+:')

    for line in lines:
        trimmed = line.strip()
        if question_re.match(trimmed):
            total_questions += 1
            if current_question:
                complete_questions.append("\n".join(current_question))
            current_question = [line]
        elif trimmed == "---":
            current_question.append(line)
            if len(current_question) > 1:
                complete_questions.append("\n".join(current_question))
            current_question = []
        elif current_question or trimmed:
            current_question.append(line)

    if found_closing and current_question:
        complete_questions.append("\n".join(current_question))

    content_to_release = content if found_closing else "\n\n---\n\n".join(complete_questions)

    return {
        "content": content_to_release,
        "metadata": {
            "isComplete": found_closing,
            "completeQuestionCount": len(complete_questions),
            "totalQuestions": total_questions,
            "hasPartialContent": not found_closing and len(current_question) > 0,
        },
    }


def _validate_flashcard_streaming(content: str, found_closing: bool) -> dict[str, Any]:
    lines = content.split("\n")
    complete_cards: list[str] = []
    current_card: list[str] = []
    total_cards = 0
    has_front = False
    has_back = False

    front_re = re.compile(r'^(?:Front|Question):', re.IGNORECASE)
    back_re = re.compile(r'^(?:Back|Answer):', re.IGNORECASE)

    for line in lines:
        trimmed = line.strip()
        if front_re.match(trimmed):
            if current_card and has_front and has_back:
                complete_cards.append("\n".join(current_card))
            current_card = [line]
            has_front = True
            has_back = False
            total_cards += 1
        elif back_re.match(trimmed):
            current_card.append(line)
            has_back = True
        elif trimmed == "---":
            if current_card and has_front and has_back:
                complete_cards.append("\n".join(current_card))
            current_card = []
            has_front = False
            has_back = False
        elif current_card:
            current_card.append(line)

    if found_closing and current_card and has_front and has_back:
        complete_cards.append("\n".join(current_card))

    content_to_release = content if found_closing else "\n\n---\n\n".join(complete_cards)

    return {
        "content": content_to_release,
        "metadata": {
            "isComplete": found_closing,
            "completeCardCount": len(complete_cards),
            "totalCards": total_cards,
            "hasPartialContent": not found_closing and len(current_card) > 0,
        },
    }


def _validate_recipe_streaming(content: str, found_closing: bool) -> dict[str, Any]:
    has_title = bool(re.search(r'^###\s+.+$', content, re.MULTILINE))
    has_ingredients = bool(re.search(r'####\s*Ingredients?:', content, re.IGNORECASE))
    has_instructions = bool(re.search(r'####\s*Instructions?:', content, re.IGNORECASE))

    if found_closing:
        content_to_release = content
    elif has_title and (has_ingredients or has_instructions):
        content_to_release = content
    else:
        content_to_release = ""

    return {
        "content": content_to_release,
        "metadata": {
            "isComplete": found_closing,
            "hasTitle": has_title,
            "hasIngredients": has_ingredients,
            "hasInstructions": has_instructions,
            "hasPartialContent": not found_closing and len(content) > 0,
        },
    }


# ---------------------------------------------------------------------------
# Markdown element detection
# ---------------------------------------------------------------------------

_CODE_BLOCK_RE = re.compile(r'^```(\w*)')
_TABLE_SEP_RE = re.compile(r'^\|[:\s|\-]+\|?$')
_IMAGE_STD_RE = re.compile(r'^!\[(.*?)\]\((https?://[^\s)]+)\)')
_IMAGE_CUSTOM_RE = re.compile(r'\[Image URL: (https?://[^\s\]]+)\]')
_VIDEO_CUSTOM_RE = re.compile(r'\[Video URL: (https?://[^\s\]]+)\]')


def detect_code_block(line: str) -> tuple[bool, str | None]:
    """Returns (is_code_block, language)."""
    trimmed = line.strip()
    if not trimmed.startswith("```"):
        return False, None
    m = _CODE_BLOCK_RE.match(trimmed)
    lang = m.group(1) if m and m.group(1) else None
    return True, lang


def extract_code_block(start_index: int, lines: list[str]) -> ExtractionResult:
    """Extract code block content starting after the opening ```."""
    content_lines: list[str] = []
    i = start_index

    while i < len(lines):
        line = lines[i]
        trimmed = line.strip()

        if trimmed.startswith("```"):
            break

        backtick_idx = line.find("```")
        if backtick_idx != -1:
            before = line[:backtick_idx]
            if before.strip():
                content_lines.append(before)
            break

        content_lines.append(line)
        i += 1

    return ExtractionResult(
        content="\n".join(content_lines),
        next_index=i + 1,
    )


def detect_table_row(line: str) -> bool:
    trimmed = remove_matrx_pattern(line).strip()
    return trimmed.startswith("|") and "|" in trimmed[1:]


def _is_table_separator(line: str) -> bool:
    trimmed = remove_matrx_pattern(line).strip()
    return bool(_TABLE_SEP_RE.match(trimmed))


def extract_table(start_index: int, lines: list[str]) -> ExtractionResult:
    table_lines = [lines[start_index]]
    i = start_index + 1

    while i < len(lines) and detect_table_row(lines[i]):
        table_lines.append(lines[i])
        i += 1

    if len(table_lines) < 2 or not _is_table_separator(table_lines[1]):
        return ExtractionResult(content="", next_index=start_index + 1, metadata={"isValid": False})

    table_has_ended = i < len(lines)
    content = "\n".join(table_lines)

    # Table completion analysis
    data_lines = table_lines[2:]
    complete_count = len(data_lines) if table_has_ended else max(0, len(data_lines) - 1)
    has_partial = not table_has_ended and len(data_lines) > 0

    return ExtractionResult(
        content=content,
        next_index=i,
        metadata={
            "isComplete": table_has_ended or not has_partial,
            "completeRowCount": complete_count,
            "totalRows": len(data_lines),
            "hasPartialContent": has_partial,
        },
    )


def detect_image(line: str) -> tuple[bool, str | None, str | None]:
    """Returns (is_image, src, alt)."""
    trimmed = line.strip()
    m = _IMAGE_STD_RE.match(trimmed)
    if m:
        return True, m.group(2), m.group(1)
    m = _IMAGE_CUSTOM_RE.search(trimmed)
    if m:
        return True, m.group(1), "Image"
    return False, None, None


def detect_video(line: str) -> tuple[bool, str | None, str | None]:
    """Returns (is_video, src, alt)."""
    trimmed = line.strip()
    m = _VIDEO_CUSTOM_RE.search(trimmed)
    if m:
        return True, m.group(1), "Video"
    return False, None, None


# ---------------------------------------------------------------------------
# Main splitter — Python port of splitContentIntoBlocksV2
# ---------------------------------------------------------------------------

SPECIAL_CODE_LANGUAGES = {"transcript", "tasks", "structured_info", "questionnaire", "flashcards", "cooking_recipe"}


def split_content_into_blocks(md_content: str) -> list[DetectedBlock]:
    """
    Split markdown content into typed blocks.

    Direct port of TypeScript splitContentIntoBlocksV2.
    """
    blocks: list[DetectedBlock] = []
    lines = re.split(r'\r?\n', md_content)
    current_text = ""
    i = 0

    def flush_text() -> None:
        nonlocal current_text
        if current_text.strip():
            blocks.append(DetectedBlock(type="text", content=current_text.rstrip()))
            current_text = ""

    while i < len(lines):
        line = lines[i]
        processed_line = remove_matrx_pattern(line)
        trimmed_line = processed_line.strip()

        # Skip lines that become empty after MATRX removal but weren't originally
        if trimmed_line == "" and processed_line != "":
            i += 1
            continue

        # 1. MATRX pattern
        matrx_match = detect_matrx_pattern(line)
        if matrx_match:
            flush_text()
            metadata = parse_matrx_metadata(matrx_match.group(1))
            blocks.append(DetectedBlock(
                type="matrxBroker",
                content=matrx_match.group(0),
                metadata=metadata,
            ))
            i += 1
            continue

        # 2. Code block
        is_code, language = detect_code_block(processed_line)
        if is_code:
            flush_text()
            extraction = extract_code_block(i + 1, lines)

            if language and language in SPECIAL_CODE_LANGUAGES:
                blocks.append(DetectedBlock(type=language, content=extraction.content))
            elif language == "json":
                json_type = detect_json_block_type(extraction.content)
                if json_type:
                    state = validate_json_block(extraction.content, json_type)
                    blocks.append(DetectedBlock(
                        type=json_type,
                        content=extraction.content,
                        language="json",
                        metadata=state.get("metadata", {}),
                    ))
                else:
                    blocks.append(DetectedBlock(type="code", content=extraction.content, language=language))
            else:
                blocks.append(DetectedBlock(type="code", content=extraction.content, language=language))

            i = extraction.next_index
            continue

        # 3. XML tag block
        xml_type = detect_xml_block_type(processed_line)
        if xml_type:
            flush_text()
            extraction = extract_xml_block(xml_type, i + 1, lines)
            blocks.append(DetectedBlock(
                type=xml_type,
                content=extraction.content,
                metadata=extraction.metadata,
            ))
            i = extraction.next_index
            continue

        # 4. Image
        is_img, src, alt = detect_image(line)
        if is_img:
            flush_text()
            blocks.append(DetectedBlock(type="image", content=trimmed_line, src=src, alt=alt))
            i += 1
            continue

        # 4.5. Video
        is_vid, src, alt = detect_video(line)
        if is_vid:
            flush_text()
            blocks.append(DetectedBlock(type="video", content=trimmed_line, src=src, alt=alt))
            i += 1
            continue

        # 5. Table
        if detect_table_row(line):
            flush_text()
            extraction = extract_table(i, lines)
            if extraction.metadata.get("isValid") is not False:
                blocks.append(DetectedBlock(
                    type="table",
                    content=extraction.content,
                    metadata=extraction.metadata,
                ))
                i = extraction.next_index
            else:
                current_text += processed_line + "\n"
                i += 1
            continue

        # 6. Accumulate as text
        suffix = "\n" if processed_line and i < len(lines) - 1 else ""
        current_text += processed_line + suffix
        i += 1

    flush_text()
    return blocks
