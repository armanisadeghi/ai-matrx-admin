Here’s a **clean, practical mental model** of the most important data/content formats, with **tiny examples + what they’re for + pros/cons + trend direction**.

---

# 1. JSON (JavaScript Object Notation)

```json
{
  "name": "Arman",
  "age": 42,
  "skills": ["AI", "React", "Python"]
}
```

**What it is:**
Lightweight key-value data format used for APIs and data exchange.

**Used for:**
APIs, frontend ↔ backend communication, configs (sometimes)

**Advantages:**

* Very simple + readable
* Native to JavaScript ecosystems
* Widely supported everywhere ([Wikipedia][1])

**Disadvantages:**

* No comments
* Limited typing (no dates, etc.)
* Can get messy for large configs

**Trend:**
📈 **Still dominant and growing** (basically the default everywhere)

---

# 2. YAML (YAML Ain’t Markup Language)

```yaml
name: Arman
age: 42
skills:
  - AI
  - React
  - Python
```

**What it is:**
Human-friendly data format using indentation instead of brackets.

**Used for:**
Configs (Docker, Kubernetes, CI/CD, etc.)

**Advantages:**

* Extremely readable
* Less syntax noise than JSON
* Supports comments

**Disadvantages:**

* Whitespace-sensitive (easy to break)
* Parsing can be inconsistent
* Slower / less strict

**Trend:**
📈 **Growing fast** (especially in DevOps / infra) ([CelerData][2])

---

# 3. XML (Extensible Markup Language)

```xml
<user>
  <name>Arman</name>
  <age>42</age>
  <skills>
    <skill>AI</skill>
    <skill>React</skill>
  </skills>
</user>
```

**What it is:**
Tag-based structured document format.

**Used for:**
Enterprise systems, legacy APIs, finance, healthcare

**Advantages:**

* Very strict + schema validation
* Supports complex structures
* Strong tooling

**Disadvantages:**

* Very verbose (lots of extra text) ([Astronomer][3])
* Harder to read/write
* Heavy for modern apps

**Trend:**
📉 **Declining overall**, but still strong in enterprise niches ([Inery][4])

---

# 4. Markdown

```markdown
# User Profile

**Name:** Arman  
**Skills:**
- AI
- React
- Python
```

**What it is:**
Lightweight format for writing formatted text.

**Used for:**
Docs, README files, content systems, LLM outputs

**Advantages:**

* Extremely readable
* Easy to convert to HTML
* Great for content + docs

**Disadvantages:**

* Not designed for structured data
* No strict schema

**Trend:**
📈 **Very strong growth** (docs + AI + content systems)

---

# 5. CSV (Comma-Separated Values)

```csv
name,age,skill
Arman,42,AI
Arman,42,React
```

**What it is:**
Flat table format.

**Used for:**
Spreadsheets, exports, analytics

**Advantages:**

* Extremely simple
* Very compact
* Universal compatibility

**Disadvantages:**

* No nesting (flat only)
* No types or validation ([beeceptor.com][5])

**Trend:**
➡️ **Stable** (not growing, not dying)

---

# 6. TOML (you should know this one)

```toml
name = "Arman"
age = 42

[skills]
primary = ["AI", "React"]
```

**What it is:**
Config-focused format (cleaner than JSON, stricter than YAML)

**Used for:**
Modern configs (Rust, Python `pyproject.toml`)

**Advantages:**

* Clear + structured
* Less ambiguous than YAML
* Supports types well

**Disadvantages:**

* Less flexible than YAML
* Smaller ecosystem

**Trend:**
📈 **Rising** (modern tooling standardizing on it)

---

# 7. Binary Formats (MessagePack / Protobuf)

(Not human-readable)

```
<binary data>
```

**What it is:**
Compact encoded data for machines.

**Used for:**
High-performance systems, microservices, streaming

**Advantages:**

* Very fast
* Much smaller payloads
* Efficient for scale ([CelerData][2])

**Disadvantages:**

* Not human-readable
* Harder to debug

**Trend:**
📈 **Growing in backend / infra systems**

---

# Quick Comparison (mental model)

| Format   | Human Readable | Structure | Typical Use |
| -------- | -------------- | --------- | ----------- |
| JSON     | ✅ Medium       | Nested    | APIs        |
| YAML     | ✅ High         | Nested    | Configs     |
| XML      | ⚠️ Medium      | Nested    | Enterprise  |
| Markdown | ✅ High         | Content   | Docs        |
| CSV      | ✅ High         | Flat      | Tables      |
| TOML     | ✅ High         | Nested    | Configs     |
| Binary   | ❌ No           | Nested    | Performance |

---

# What matters (your takeaway)

Think in **3 categories**:

### 1. Data exchange (APIs)

* JSON (default)
* Binary (performance)

### 2. Configuration

* YAML (flexible)
* TOML (clean + modern)

### 3. Content / human-facing

* Markdown

---

If you want next step, I can map this directly to **your system (scopes / tasks / agents)** and recommend exactly which format to use where.

[1]: https://en.wikipedia.org/wiki/JSON?utm_source=chatgpt.com "JSON"
[2]: https://celerdata.com/glossary/understanding-data-serialization-a-format-comparison-guide?utm_source=chatgpt.com "Understanding Data Serialization: A Format Comparison ..."
[3]: https://www.astronomer.io/blog/data-formats-101/?utm_source=chatgpt.com "Data Format Types: CSV vs JSON vs XML Explained"
[4]: https://inery.io/blog/article/understanding-data-formats-csv-json-xml/?utm_source=chatgpt.com "A Guide to the World of Data Formats: CSV, JSON, XML, ..."
[5]: https://beeceptor.com/docs/concepts/data-exchange-formats/?utm_source=chatgpt.com "Web Data Serialization - JSON, XML, YAML & More ..."


---


## `SKILL.md`

```markdown
---
name: error-handling-framework
description: >-
  Guide implementation of provider-agnostic error handling and recovery for
  multi-provider API integrations. Covers error cataloging, recovery
  classification (retry, correct-and-retry, fail-fast), discrete handler
  functions, and structured frontend communication. Use when adding error
  handling for a new provider, implementing recovery logic, classifying errors,
  creating error handler functions, emitting frontend error/warning messages,
  or when working on API integration resilience.
---

# Provider-Agnostic Error Handling & Recovery Framework

## Core Mandate

Every known error from every integrated provider must be individually cataloged,
classified by recovery strategy, and handled through discrete, single-responsibility
handler functions — all routed through the existing provider/class abstraction
hierarchy. Never hardcode to specific entities.

## The Four Concerns

### 1. Error Catalog

Before writing any handler, **exhaustively catalog** the provider's documented errors
from official API docs. Each entry records:

- Error identity (code, name, HTTP status)
- Trigger conditions
- Abstraction level (provider-wide · API class · model-specific)
- Recovery classification
- Handling status (unhandled · implemented · verified)

> See [error-catalog-template.md](error-catalog-template.md) for the catalog format.

### 2. Recovery Classification

Every cataloged error gets **exactly one** classification:

| Strategy | When | Key Rule |
|---|---|---|
| **Retry** | Transient failures (network, rate limits). Request is correct. | Retry with intelligent backoff. |
| **Correct-and-retry** | Fixable config errors that don't alter semantic intent. | **Must** emit structured warnings to logs AND frontend. |
| **Fail-fast** | Recovery would alter the user's actual request or intent. | Never silently retry. Emit actionable error and halt. |

> See [recovery-classification.md](recovery-classification.md) for classification rules and decision tree.

### 3. Handler Implementation

- One discrete handler function per known error.
- Small, individually testable, individually adjustable.
- Organized by provider, registered at the correct abstraction level.
- **No model names, version strings, or volatile identifiers inline** — use config/DB lookups.

> See [handler-patterns.md](handler-patterns.md) for implementation patterns and anti-patterns.

### 4. Frontend Communication Contract

Every error event and every automatic recovery emits a structured message to the
frontend. Backend logging and frontend emission are **independent obligations** —
completing one does not satisfy the other.

Every payload includes:
1. What inputs/state caused the problem
2. The specific failure with precise details (e.g., exact threshold exceeded)
3. What action was taken or what the user should do

> See [frontend-contract.md](frontend-contract.md) for payload schema and severity rules.

## Non-Negotiable Principles

Apply these on every implementation, especially under time pressure:

1. **Abstraction conformance** — Route through the existing classification hierarchy.
   If no level fits, propose a new class. Never bypass.

2. **Research before implementation** — Catalog first, code second. Narrow fixes
   without full context will be too brittle or too broad.

3. **Loud recovery** — Every automatic correction emits a structured warning with
   original inputs, detected problem, and correction applied. Invisible recovery
   becomes invisible liability.

4. **Semantic safety** — Never silently alter what the user asked for. If recovery
   requires changing content or meaning, fail visibly. LLMs produce plausible
   output from corrupted input without complaint.

5. **No shortcuts under pressure** — A hardcoded workaround for today's error
   guarantees tomorrow's regression for every entity it doesn't cover.

## Workflow: Adding a New Provider

Copy and track progress:
```

Provider Error Handling:

* [ ] Step 1: Research — catalog all errors from official docs
* [ ] Step 2: Classify — assign recovery strategy to each error
* [ ] Step 3: Implement — write discrete handlers at correct abstraction level
* [ ] Step 4: Emit — wire structured frontend messages for every path
* [ ] Step 5: Verify — confirm severity tagging, log output, and frontend payloads
* [ ] Step 6: Document — update catalog with handling status

```
