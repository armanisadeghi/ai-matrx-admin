# Research System — Agent Specifications

All agents use the platform's `Agent.from_prompt(uuid)` → `.set_variable()` → `.execute()` pattern from `ai/system_agents.py`. Each agent is a **prompt builtin** created in the platform UI. This document specifies exact variables, expected output format, model recommendations, and example prompt instructions for each.

---

## Generic Agents (Phase 2)

These are the 4 core agents used by default when no template-specific agents are configured.

### 1. Page Summary Agent (Tier A)

**Purpose:** Summarize a single scraped page into a concise, information-dense research summary.

**Agent Type:** `page_summary`

**Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `topic` | string | The research topic/subject name |
| `page_content` | string | Full extracted text content of the page |
| `page_url` | string | Source URL |
| `page_title` | string | Page title |

**Expected Output:** Plain text (markdown). Concise summary (200-800 words) capturing:
- Key facts and data points
- Relevant quotes or claims
- Information directly related to the research topic
- Notable context (publication date, author credibility if apparent)

**Model Recommendation:** Fast/cheap model (e.g., Gemini Flash, GPT-4o-mini, Claude Haiku). Cost efficiency is critical since this runs per-page (10+ calls per research).

**Example Prompt Instructions:**
```
You are a research analyst. Given a scraped web page about {topic}, extract and summarize the key information.

Focus on:
- Facts, data points, and verifiable claims
- Information directly relevant to {topic}
- Notable context about the source

Do NOT:
- Include boilerplate, navigation, or irrelevant content
- Make assumptions beyond what the content states
- Add opinions or analysis — just distill the facts

Keep your summary between 200-800 words. Be concise but don't lose important details.
```

---

### 2. Keyword Synthesis Agent (Tier B)

**Purpose:** Synthesize all search results and page summaries for a single keyword into a coherent keyword-level analysis.

**Agent Type:** `keyword_synthesis`

**Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `topic` | string | The research topic/subject name |
| `keyword` | string | The specific keyword searched |
| `search_results` | string | Formatted text of top 20 search result titles, URLs, descriptions |
| `page_summaries` | string | All Tier A page summaries for this keyword, labeled by source URL |

**Expected Output:** Plain text (markdown). Keyword-level synthesis (500-1500 words) covering:
- Thematic overview of what this keyword reveals about the topic
- Cross-source corroboration (what multiple sources agree on)
- Unique information from individual sources (with attribution)
- Information gaps identified
- Relevance assessment of this keyword angle

**Model Recommendation:** Mid-tier model (e.g., GPT-4o, Claude Sonnet, Gemini Pro). Needs stronger reasoning for synthesis.

**Example Prompt Instructions:**
```
You are a senior research analyst synthesizing information found by searching for "{keyword}" while researching {topic}.

You have:
1. Search result previews (titles + descriptions) from the search engine
2. Detailed summaries of the top scraped pages

Create a synthesis that:
- Identifies the dominant themes and patterns across sources
- Notes where multiple sources corroborate information (high confidence)
- Highlights unique findings from individual sources (with source attribution)
- Identifies gaps — what we expected to find but didn't
- Assesses how relevant this keyword angle is to the overall research

Structure your synthesis with clear sections. Use markdown headers for organization.
```

---

### 3. Research Report Agent (Tier C)

**Purpose:** Generate the full research report by combining all search data, page summaries, and keyword syntheses.

**Agent Type:** `research_report`

**Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `topic` | string | The research topic/subject name |
| `all_search_results` | string | Combined search results across all keywords |
| `all_page_summaries` | string | All Tier A summaries, organized by keyword |
| `keyword_syntheses` | string | All Tier B keyword syntheses |

**Expected Output:** Plain text (markdown). Comprehensive research report (1000-3000+ words) with:
- Executive summary
- Key findings organized by theme (not by keyword)
- Detailed analysis sections
- Source reliability assessment
- Information gaps and recommended next steps
- Sources cited throughout

**Model Recommendation:** Capable model (e.g., Claude Sonnet, GPT-4o, Gemini Pro). This is the flagship output.

**Example Prompt Instructions:**
```
You are an expert research analyst creating a comprehensive research report on {topic}.

You have been given:
1. Search results from multiple keywords
2. Detailed per-page summaries of scraped content
3. Keyword-level syntheses that organize findings by search angle

Create a thorough research report that:
- Opens with an executive summary (2-3 paragraphs)
- Organizes findings by THEME, not by keyword (the keywords were just search angles)
- Cross-references information across sources for validation
- Notes conflicting information where it exists
- Cites specific sources throughout (by URL or title)
- Identifies what we know, what's uncertain, and what's unknown
- Closes with recommended next steps for further research

Use markdown formatting with headers, bullet points, and bold for emphasis.
```

---

### 4. Updater Agent

**Purpose:** Update an existing research report with new or changed information without starting from scratch.

**Agent Type:** `updater`

**Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `topic` | string | The research topic/subject name |
| `previous_report` | string | The most recent research report |
| `removed_sources` | string | List of URLs/titles removed from scope (if any) |
| `new_information` | string | New page summaries, new keyword syntheses, or updated content |

**Expected Output:** Plain text (markdown). Updated research report that:
- Preserves the structure and valuable content from the previous report
- Integrates new information naturally into the existing narrative
- Removes or notes retracted/removed source claims
- Marks what changed (optional: `[UPDATED]` tags or changelog at bottom)

**Model Recommendation:** Capable model (same tier as Research Report Agent).

**Example Prompt Instructions:**
```
You are updating an existing research report on {topic}.

You have:
1. The previous version of the report
2. Sources that have been removed from scope (if any)
3. New information that needs to be incorporated

Your task:
- Preserve all valuable content from the previous report
- Integrate new information naturally — don't just append it
- If sources were removed, adjust any claims that relied solely on those sources
- Maintain the same organizational structure unless the new info warrants restructuring
- At the end, add a brief "Changes in this version" note listing what was updated

Output the complete updated report (not just the changes).
```

---

## Phase 4 — Template-Specific Agents

### Company Research Template (3 agents)

#### Company Page Summary Agent
- Same variables as generic Page Summary, plus awareness of business information patterns
- Prompt focuses on: company details, services/products, leadership, financials, locations, news, reviews
- Extracts structured data when possible: addresses, phone numbers, founding year, employee count

#### Company Keyword Synthesis Agent
- Same variables as generic Keyword Synthesis
- Prompt organizes findings into business categories: overview, services, leadership, financials, market position, reputation

#### Company Research Report Agent
- Same variables as generic Research Report
- Produces report with business-oriented sections: Company Overview, Services & Products, Leadership & Team, Market Position, Reputation & Reviews, Contact Information, Key Findings

### Scientific Research Template (3 agents)

#### Scientific Page Summary Agent
- Extra focus on: methodology, sample sizes, statistical significance, peer review status, journal impact
- Distinguishes between primary research, review articles, and opinion pieces
- Extracts: study type, sample size, key metrics, conclusions, limitations

#### Scientific Keyword Synthesis Agent
- Organizes by evidence quality (meta-analyses > RCTs > observational > case reports)
- Notes consensus vs. controversial findings
- Tracks methodology patterns

#### Scientific Research Report Agent
- Sections: Background, Current State of Research, Key Findings by Evidence Level, Controversies & Debates, Gaps in Research, Future Directions

### Person Research Template (3 agents)

#### Person Page Summary Agent
- Focuses on: biographical details, career timeline, achievements, public statements, media coverage
- Distinguishes between primary sources (interviews, official bios) and secondary (news, third-party articles)

#### Person Keyword Synthesis Agent
- Organizes chronologically and by life domain (career, education, public life, achievements)
- Cross-references biographical facts across sources

#### Person Research Report Agent
- Sections: Overview, Background & Education, Career Timeline, Key Achievements, Public Presence, Notable Quotes/Statements, Sources

### Product Research Template (3 agents)

#### Product Page Summary Agent
- Focuses on: specifications, pricing, reviews, comparisons, pros/cons
- Extracts: price points, features, ratings, reviewer sentiment
- Distinguishes between official product info and independent reviews

#### Product Keyword Synthesis Agent
- Organizes by feature comparison, price comparison, user sentiment
- Identifies common praise and complaints across reviews

#### Product Research Report Agent
- Sections: Product Overview, Key Features & Specs, Pricing Analysis, User Reviews Summary, Competitor Comparison, Pros & Cons, Recommendation

### Marketing Analysis Template (3 agents)

#### Marketing Page Summary Agent
- Focuses on: brand messaging, target audience indicators, marketing channels, competitor positioning
- Extracts: slogans, value propositions, audience demographics mentioned, channel strategies

#### Marketing Keyword Synthesis Agent
- Organizes by marketing dimension: brand identity, audience, channels, messaging, competitive position
- Identifies patterns in how the brand presents itself vs. how it's perceived

#### Marketing Research Report Agent
- Sections: Brand Overview, Target Audience Profile, Brand Messaging & Positioning, Marketing Channels, Competitive Landscape, Brand Perception, Strategic Recommendations

---

## Phase 5 — Tagging & Document Agents

### Tag Consolidation Agent

**Purpose:** Consolidate all information from sources tagged with a specific tag into a unified section.

**Agent Type:** `tag_consolidation`

**Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `topic` | string | The research topic |
| `tag_name` | string | The tag being consolidated (e.g., "services", "leadership") |
| `tagged_page_contents` | string | Full content from all sources tagged with this tag |
| `tagged_page_summaries` | string | Summaries from all sources tagged with this tag |

**Expected Output:** Unified section (200-1000 words) that distills the tagged information from all sources into a single authoritative section. Cites sources.

---

### Auto-Tagger Agent

**Purpose:** Suggest which tags should be assigned to a source based on its content.

**Agent Type:** `auto_tagger`

**Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `topic` | string | The research topic |
| `page_content` | string | Full content of the page |
| `available_tags` | string | JSON array of available tags: `[{name, description}]` |

**Expected Output:** JSON structured output:
```json
{
  "suggested_tags": [
    {"name": "services", "confidence": 0.95, "reason": "Page lists 12 specific services offered"},
    {"name": "contact", "confidence": 0.8, "reason": "Contains address and phone number"}
  ]
}
```

---

### Document Assembly Agent

**Purpose:** Assemble tag consolidations into a final polished research document.

**Agent Type:** `document_assembly`

**Variables:**
| Variable | Type | Description |
|----------|------|-------------|
| `topic` | string | The research topic |
| `tag_consolidations` | string | All tag consolidation sections, labeled by tag |
| `research_report` | string | The Tier C research report for additional context |

**Expected Output:** Final polished document with:
- Title
- Table of contents
- Introduction
- Sections (one per tag consolidation, rewritten for flow)
- Conclusion
- Sources
