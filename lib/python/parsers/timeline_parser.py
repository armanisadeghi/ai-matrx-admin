"""Timeline parser — port of parseTimelineMarkdown.ts."""

from __future__ import annotations

import re

from lib.python.models.timeline import TimelineBlockData, TimelineEvent, TimelinePeriod


def parse_timeline(content: str) -> TimelineBlockData | None:
    """Parse timeline markdown into structured data."""
    try:
        clean = re.sub(r'</?timeline>', '', content).strip()
        lines = [l for l in clean.split("\n") if l]

        title = ""
        description = ""
        periods: list[TimelinePeriod] = []
        current_period: TimelinePeriod | None = None
        i = 0

        while i < len(lines):
            line = lines[i]
            trimmed = line.strip()

            # Title
            if trimmed.startswith("###") and not title:
                title = re.sub(r'^#+\s*', '', trimmed).strip()
                i += 1
                continue

            # Description
            if title and not description and not trimmed.startswith("#") and not trimmed.startswith("**") and not trimmed.startswith("-") and trimmed:
                description = trimmed
                i += 1
                continue

            # Period header
            period_m = re.match(r'^\*\*([^*]+)\*\*$', trimmed)
            if period_m:
                if current_period and current_period.events:
                    periods.append(current_period)
                current_period = TimelinePeriod(period=period_m.group(1).strip())
                i += 1
                continue

            # Event bullet
            if line.startswith("- ") and current_period is not None:
                event_text = re.sub(r'^-\s*', '', line).strip()
                ev_title, ev_date, ev_category, ev_status = _parse_event_text(event_text)

                # Collect description from following indented lines
                j = i + 1
                desc_lines: list[str] = []
                while j < len(lines):
                    next_line = lines[j]
                    next_trimmed = next_line.strip()
                    if next_line.startswith("- ") or next_trimmed.startswith("**") or next_trimmed.startswith("#"):
                        break
                    if next_trimmed:
                        desc_lines.append(re.sub(r'^-\s*', '', next_trimmed).strip() if next_trimmed.startswith("-") else next_trimmed)
                    j += 1

                ev_desc = " ".join(desc_lines) or ev_title
                ev_id = f"{current_period.period}-{len(current_period.events)}"

                current_period.events.append(TimelineEvent(
                    id=ev_id,
                    title=ev_title,
                    date=ev_date or "TBD",
                    description=ev_desc,
                    status=ev_status,
                    category=ev_category or None,
                ))
                i = j
                continue

            i += 1

        if current_period and current_period.events:
            periods.append(current_period)

        return TimelineBlockData(title=title or "Timeline", description=description or None, periods=periods)
    except Exception:
        return None


def _parse_event_text(text: str) -> tuple[str, str, str, str | None]:
    """Parse event text into (title, date, category, status)."""
    ev_title = text
    ev_date = ""
    ev_category = ""
    ev_status: str | None = None

    bold_m = re.match(r'^\*\*([^*]+)\*\*(.*)$', text)
    if bold_m:
        ev_title = bold_m.group(1).strip()
        remainder = bold_m.group(2).strip()
    else:
        date_m = re.match(r'^(.+?)\s*\(([^)]+)\)(.*)$', text)
        if date_m:
            ev_title = date_m.group(1).strip()
            remainder = f"({date_m.group(2)}){date_m.group(3)}"
        else:
            cat_m = re.match(r'^(.+?)\s*\[([^\]]+)\](.*)$', text)
            if cat_m:
                ev_title = cat_m.group(1).strip()
                ev_category = cat_m.group(2).strip()
            return ev_title, ev_date, ev_category, ev_status
            remainder = ""

    # Extract date
    date_m = re.match(r'^\s*\(([^)]+)\)(.*)$', remainder)
    if date_m:
        ev_date = date_m.group(1).strip()
        remainder = date_m.group(2).strip()

    # Extract category
    cat_m = re.match(r'^\s*\[([^\]]+)\](.*)$', remainder)
    if cat_m:
        ev_category = cat_m.group(1).strip()
        remainder = cat_m.group(2).strip()

    # Extract status
    lower = remainder.lower()
    if "completed" in lower:
        ev_status = "completed"
    elif "in-progress" in lower or "in progress" in lower:
        ev_status = "in-progress"
    elif "pending" in lower:
        ev_status = "pending"

    return ev_title, ev_date, ev_category, ev_status
