"""Research parser — port of parseResearchMarkdown.ts."""

from __future__ import annotations

import re

from lib.python.models.research import ResearchBlockData, ResearchSection


def parse_research(content: str) -> ResearchBlockData | None:
    """Parse research markdown into structured data."""
    try:
        clean = re.sub(r'</?research>', '', content).strip()
        lines = clean.split("\n")

        title = ""
        overview = ""
        introduction = ""
        conclusion = ""
        research_scope: str | None = None
        key_focus_areas: str | None = None
        analysis_period: str | None = None
        research_questions: list[str] = []
        sections: list[ResearchSection] = []
        key_takeaways: list[str] = []

        current_section_title = ""
        current_section_lines: list[str] = []
        in_section = ""

        def flush_section() -> None:
            nonlocal current_section_title, current_section_lines, in_section
            nonlocal overview, introduction, conclusion

            content_text = "\n".join(current_section_lines).strip()
            lower = current_section_title.lower()

            if "overview" in lower or "executive summary" in lower:
                overview = content_text
                _extract_metadata(content_text)
            elif "introduction" in lower:
                introduction = content_text
            elif "conclusion" in lower:
                conclusion = content_text
            elif current_section_title and content_text:
                sections.append(ResearchSection(title=current_section_title, content=content_text))

            current_section_lines = []

        def _extract_metadata(text: str) -> None:
            nonlocal research_scope, key_focus_areas, analysis_period
            m = re.search(r'\*\*Research Scope:\*\*\s*(.+)', text)
            if m:
                research_scope = m.group(1).strip()
            m = re.search(r'\*\*Key Focus Areas:\*\*\s*(.+)', text)
            if m:
                key_focus_areas = m.group(1).strip()
            m = re.search(r'\*\*Analysis Period:\*\*\s*(.+)', text)
            if m:
                analysis_period = m.group(1).strip()

        for line in lines:
            header_m = re.match(r'^(#{1,6})\s+(.+)', line)
            if header_m:
                flush_section()
                current_section_title = header_m.group(2).strip()
                level = len(header_m.group(1))
                if level == 1 and not title:
                    title = current_section_title
                    current_section_title = ""
                continue

            current_section_lines.append(line)

        flush_section()

        # Extract numbered questions from introduction
        if introduction:
            for m in re.finditer(r'^\d+\.\s+(.+)$', introduction, re.MULTILINE):
                research_questions.append(m.group(1).strip())

        # Extract takeaways from conclusion
        if conclusion:
            for m in re.finditer(r'^[-*]\s+(.+)$', conclusion, re.MULTILINE):
                key_takeaways.append(m.group(1).strip())

        return ResearchBlockData(
            title=title or "Research",
            overview=overview,
            research_scope=research_scope,
            key_focus_areas=key_focus_areas,
            analysis_period=analysis_period,
            introduction=introduction,
            research_questions=research_questions,
            sections=sections,
            conclusion=conclusion,
            key_takeaways=key_takeaways,
        )
    except Exception:
        return None
