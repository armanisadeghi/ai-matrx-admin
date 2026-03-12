"""Diff parser — detects diff style in code blocks."""

from __future__ import annotations

import re

_SEARCH_REPLACE_RE = re.compile(r'<<<<<<< SEARCH|>>>>>>> REPLACE|=======')
_UNIFIED_DIFF_RE = re.compile(r'^[+-]{3}\s|^@@\s', re.MULTILINE)


def looks_like_diff(content: str) -> bool:
    """Check if code content looks like a diff."""
    return bool(_SEARCH_REPLACE_RE.search(content) or _UNIFIED_DIFF_RE.search(content))


def detect_diff_style(content: str) -> str:
    """Detect the diff style: 'search_replace' or 'unified'."""
    if _SEARCH_REPLACE_RE.search(content):
        return "search_replace"
    return "unified"
