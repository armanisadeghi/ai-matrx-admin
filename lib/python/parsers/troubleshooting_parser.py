"""Troubleshooting parser — port of parseTroubleshootingMarkdown.ts."""

from __future__ import annotations

import re

from lib.python.models.troubleshooting import (
    TroubleshootingBlockData,
    TroubleshootingIssue,
    TroubleshootingSolution,
    TroubleshootingStep,
)

_SYMPTOM_RE = re.compile(r'^\*\*Symptom:\*\*')
_SOLUTION_RE = re.compile(r'^(\d+)\.\s*\*\*([^*]+)\*\*:?\s*(.*)')
_STEP_RE = re.compile(r'^\s*-\s*(.+)')
_CAUSE_RE = re.compile(r'^(?:\d+\.\s*|-\s*)(.+)')
_LINK_RE = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
_DIFFICULTY_RE = re.compile(r'\((easy|medium|hard)\)', re.IGNORECASE)
_TIME_RE = re.compile(r'\((\d+(?:\.\d+)?\s*(?:min|minute|hour|hr)s?)\)', re.IGNORECASE)


def parse_troubleshooting(content: str) -> TroubleshootingBlockData | None:
    """Parse troubleshooting markdown into structured data."""
    try:
        clean = re.sub(r'</?troubleshooting>', '', content).strip()
        lines = clean.split("\n")

        title = ""
        description: str | None = None
        issues: list[TroubleshootingIssue] = []
        current_issue: TroubleshootingIssue | None = None
        current_solution: TroubleshootingSolution | None = None
        section = ""  # "causes", "solutions", "related"
        in_code_block = False

        for line in lines:
            trimmed = line.strip()

            # Track code blocks
            if trimmed.startswith("```"):
                in_code_block = not in_code_block
                continue
            if in_code_block:
                continue

            if not trimmed:
                continue

            # Title
            if trimmed.startswith("###") and not title:
                title = re.sub(r'^#+\s*', '', trimmed).strip()
                continue

            # Symptom
            if _SYMPTOM_RE.match(trimmed):
                if current_issue:
                    issues.append(current_issue)
                symptom = _SYMPTOM_RE.sub('', trimmed).strip()
                current_issue = TroubleshootingIssue(symptom=symptom)
                section = "causes"
                current_solution = None
                continue

            # Causes section header
            if "possible cause" in trimmed.lower() or "causes:" in trimmed.lower():
                section = "causes"
                continue

            # Solutions section header
            if "solution" in trimmed.lower() and trimmed.startswith("**"):
                section = "solutions"
                continue

            # Related issues header
            if "related issue" in trimmed.lower():
                section = "related"
                continue

            if current_issue is None:
                if title and description is None:
                    description = trimmed
                continue

            # Solutions
            if section == "solutions":
                sol_m = _SOLUTION_RE.match(trimmed)
                if sol_m:
                    current_solution = TroubleshootingSolution(
                        title=sol_m.group(2).strip(),
                        description=sol_m.group(3).strip(),
                    )
                    current_issue.solutions.append(current_solution)
                    continue

                step_m = _STEP_RE.match(trimmed)
                if step_m and current_solution:
                    step_text = step_m.group(1).strip()
                    url = None
                    link_m = _LINK_RE.search(step_text)
                    if link_m:
                        url = link_m.group(2)
                    diff_m = _DIFFICULTY_RE.search(step_text)
                    time_m = _TIME_RE.search(step_text)
                    current_solution.steps.append(TroubleshootingStep(
                        text=step_text,
                        url=url,
                        difficulty=diff_m.group(1).lower() if diff_m else None,
                        time_estimate=time_m.group(1) if time_m else None,
                    ))
                    continue

            # Causes
            if section == "causes":
                cause_m = _CAUSE_RE.match(trimmed)
                if cause_m:
                    current_issue.causes.append(cause_m.group(1).strip())
                    continue

            # Related issues
            if section == "related":
                cause_m = _CAUSE_RE.match(trimmed)
                if cause_m:
                    current_issue.related_issues.append(cause_m.group(1).strip())

        if current_issue:
            issues.append(current_issue)

        return TroubleshootingBlockData(
            title=title or "Troubleshooting Guide",
            description=description,
            issues=issues,
        )
    except Exception:
        return None
