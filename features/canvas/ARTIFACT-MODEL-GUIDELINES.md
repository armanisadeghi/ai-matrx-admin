# Artifact Output Guidelines for AI Models

> **Purpose:** This document teaches AI models how to produce `<artifact>` blocks in their responses. It defines the exact syntax, supported types, and best practices. This will be converted into a model skill/system prompt.

---

## What Are Artifacts?

Artifacts are self-contained, interactive content blocks embedded in model responses. They are rendered as rich UI components (dashboards, code editors, flashcards, diagrams, etc.) and automatically persisted to the user's canvas library for later access, sharing, and versioning.

When a model produces an artifact, the system:
1. Detects the `<artifact>` tag during streaming
2. Renders a rich preview inline in the chat
3. Provides an "Open in Canvas" button for full-screen interaction
4. Persists the artifact to the database linked to the message
5. Tracks versions if the same artifact is updated in a later message

---

## Syntax

```xml
<artifact id="artifact_N" type="TYPE" title="TITLE">
CONTENT
</artifact>
```

### Required Attributes

| Attribute | Format | Description |
|-----------|--------|-------------|
| `id` | `artifact_N` where N is a sequential integer starting at 1 | Unique identifier within the conversation. Reusing an ID in a later message creates a new version. |
| `type` | One of the supported types below | Determines how the content is rendered |
| `title` | Short human-readable string | Displayed in the artifact header and canvas library |

### Rules

- The `id` MUST follow the format `artifact_N` with a sequential integer (e.g., `artifact_1`, `artifact_2`).
- Each artifact in a single message MUST have a unique `id`. Start at `artifact_1` and increment.
- The opening tag MUST be on its own line (not inline with prose text).
- The closing `</artifact>` tag MUST be on its own line.
- Content between the tags is the artifact body — its format depends on the `type`.
- Prose text can appear before, after, and between artifacts.

---

## Supported Types

### `iframe` — Interactive HTML

Full HTML documents rendered in a sandboxed iframe. Best for dashboards, visualizations, and interactive tools.

```xml
<artifact id="artifact_1" type="iframe" title="Revenue Dashboard">
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui; padding: 20px; }
    .metric { display: inline-block; padding: 16px; margin: 8px; border-radius: 8px; background: #f0f4ff; }
    .metric h3 { margin: 0; color: #666; font-size: 14px; }
    .metric .value { font-size: 32px; font-weight: bold; color: #1a1a2e; }
  </style>
</head>
<body>
  <h1>Q3 Revenue Summary</h1>
  <div class="metric">
    <h3>Total Revenue</h3>
    <div class="value">$4.2M</div>
  </div>
  <div class="metric">
    <h3>Growth</h3>
    <div class="value">+23%</div>
  </div>
</body>
</html>
</artifact>
```

**When to use:** Dashboards, data visualizations, interactive calculators, styled reports, anything that benefits from custom HTML/CSS/JS rendering.

---

### `code` — Source Code

Code with syntax highlighting in a code editor with copy/edit capabilities.

```xml
<artifact id="artifact_1" type="code" title="Data Processing Script">
import pandas as pd
import matplotlib.pyplot as plt

# Load and process data
df = pd.read_csv('sales_data.csv')
monthly = df.groupby('month')['revenue'].sum()

# Generate chart
plt.figure(figsize=(10, 6))
monthly.plot(kind='bar', color='steelblue')
plt.title('Monthly Revenue')
plt.ylabel('Revenue ($)')
plt.tight_layout()
plt.savefig('revenue_chart.png')
</artifact>
```

**When to use:** Complete scripts, configuration files, code samples that the user will want to copy, save, or reference later. Not for inline code snippets in explanations — use regular code blocks for those.

---

### `html` — HTML Fragment

HTML content rendered directly (not in an iframe). Lighter than `iframe`, no sandboxing.

```xml
<artifact id="artifact_1" type="html" title="Product Comparison Card">
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 600px;">
  <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
    <h3>Plan A</h3>
    <p style="font-size: 24px; font-weight: bold;">$29/mo</p>
    <ul>
      <li>10 users</li>
      <li>5GB storage</li>
    </ul>
  </div>
  <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
    <h3>Plan B</h3>
    <p style="font-size: 24px; font-weight: bold;">$49/mo</p>
    <ul>
      <li>50 users</li>
      <li>50GB storage</li>
    </ul>
  </div>
</div>
</artifact>
```

**When to use:** Styled content cards, layouts, or HTML fragments that don't need full document structure or JavaScript.

---

### `diagram` — Interactive Diagram

JSON structure describing nodes, edges, and layout for an interactive diagram.

```xml
<artifact id="artifact_1" type="diagram" title="Authentication Flow">
{
  "diagram": {
    "title": "Authentication Flow",
    "nodes": [
      {"id": "1", "label": "User Login", "type": "start"},
      {"id": "2", "label": "Validate Credentials", "type": "process"},
      {"id": "3", "label": "Valid?", "type": "decision"},
      {"id": "4", "label": "Generate JWT", "type": "process"},
      {"id": "5", "label": "Return Token", "type": "end"},
      {"id": "6", "label": "Return Error", "type": "end"}
    ],
    "edges": [
      {"source": "1", "target": "2"},
      {"source": "2", "target": "3"},
      {"source": "3", "target": "4", "label": "Yes"},
      {"source": "3", "target": "6", "label": "No"},
      {"source": "4", "target": "5"}
    ]
  }
}
</artifact>
```

**When to use:** System architectures, flowcharts, process diagrams, entity relationships.

---

### `flashcards` — Study Flashcards

Markdown-formatted flashcard deck with front/back pairs.

```xml
<artifact id="artifact_1" type="flashcards" title="JavaScript ES6 Features">
Front: What does the spread operator (...) do?
Back: Expands an iterable (array, string, object) into individual elements. Example: `[...arr1, ...arr2]` merges two arrays.

---

Front: What is destructuring assignment?
Back: A syntax that unpacks values from arrays or properties from objects into distinct variables. Example: `const { name, age } = person;`

---

Front: What is the difference between let and const?
Back: `let` allows reassignment, `const` does not. Both are block-scoped. Use `const` by default, `let` only when reassignment is needed.
</artifact>
```

**When to use:** Study material, vocabulary lists, Q&A review decks.

---

### `quiz` — Interactive Quiz

JSON structure for a multiple-choice quiz with scoring.

```xml
<artifact id="artifact_1" type="quiz" title="Python Basics Quiz">
{
  "quiz_title": "Python Basics",
  "category": "Programming",
  "multiple_choice": [
    {
      "question": "What is the output of print(type([]))?",
      "options": ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"],
      "correct_answer": "<class 'list'>",
      "explanation": "In Python, [] creates an empty list, so type([]) returns <class 'list'>."
    },
    {
      "question": "Which keyword is used to define a function in Python?",
      "options": ["function", "def", "func", "define"],
      "correct_answer": "def",
      "explanation": "Python uses the 'def' keyword to define functions."
    }
  ]
}
</artifact>
```

**When to use:** Knowledge assessment, test preparation, interactive learning exercises.

---

### `presentation` — Slide Deck

JSON structure for a presentation with slides.

```xml
<artifact id="artifact_1" type="presentation" title="Q3 Business Review">
{
  "presentation": {
    "slides": [
      {
        "title": "Q3 Business Review",
        "content": "Key highlights and strategic initiatives",
        "type": "title"
      },
      {
        "title": "Revenue Growth",
        "content": "- Total revenue: $4.2M (+23% YoY)\n- New customers: 142\n- Churn rate: 2.1% (down from 3.4%)",
        "type": "content"
      },
      {
        "title": "Next Steps",
        "content": "1. Launch enterprise tier\n2. Expand to EU market\n3. Hire 5 senior engineers",
        "type": "content"
      }
    ],
    "theme": {
      "primaryColor": "#2563eb",
      "secondaryColor": "#1e40af",
      "accentColor": "#60a5fa",
      "backgroundColor": "#ffffff",
      "textColor": "#1f2937"
    }
  }
}
</artifact>
```

**When to use:** Business presentations, educational slide decks, project summaries.

---

### `timeline` — Timeline Visualization

Markdown-formatted timeline with periods and events.

```xml
<artifact id="artifact_1" type="timeline" title="Project Milestones">
<timeline>
## Phase 1: Foundation (Jan - Mar 2025)

### Database Schema Design
**Date:** January 15, 2025
**Status:** Completed
Design and implement the core database schema with migrations.

### API Layer
**Date:** February 28, 2025
**Status:** Completed
Build REST API endpoints with authentication and rate limiting.

## Phase 2: Frontend (Apr - Jun 2025)

### Component Library
**Date:** April 15, 2025
**Status:** In Progress
Build reusable UI component library with design system.
</timeline>
</artifact>
```

**When to use:** Project roadmaps, historical timelines, milestone tracking.

---

### `research` — Research Report

Structured markdown research document with sections, findings, and analysis.

```xml
<artifact id="artifact_1" type="research" title="AI in Healthcare: 2025 Landscape">
<research>
# AI in Healthcare: 2025 Landscape

## Overview
Analysis of current AI applications in healthcare, focusing on diagnostic imaging, drug discovery, and patient care optimization.

## Key Findings

### Finding 1: Diagnostic Accuracy
**Source:** Nature Medicine, 2025
AI-assisted diagnosis achieves 94% accuracy in radiology, compared to 87% for unassisted radiologists.
**Significance:** Reduces missed diagnoses by 40%.

### Finding 2: Drug Discovery Speed
**Source:** Pharmaceutical Research Journal
AI-driven drug candidates enter clinical trials 60% faster than traditional methods.
**Significance:** Could save $1.5B per approved drug.

## Challenges
- Data privacy regulations vary by jurisdiction
- Integration with existing hospital IT systems remains difficult
- Clinician trust and adoption barriers

## Recommendations
1. Invest in federated learning to address privacy concerns
2. Develop standardized integration APIs for hospital systems
3. Create clinician training programs for AI-assisted tools
</research>
</artifact>
```

**When to use:** Research summaries, literature reviews, competitive analysis, market research.

---

### `comparison` — Comparison Table

JSON structure for side-by-side comparison.

```xml
<artifact id="artifact_1" type="comparison" title="Cloud Provider Comparison">
{
  "comparison": {
    "title": "Cloud Provider Comparison",
    "items": [
      {"name": "AWS", "description": "Amazon Web Services"},
      {"name": "GCP", "description": "Google Cloud Platform"},
      {"name": "Azure", "description": "Microsoft Azure"}
    ],
    "criteria": [
      {"name": "Compute Pricing", "ratings": {"AWS": 7, "GCP": 8, "Azure": 7}, "notes": {"AWS": "EC2 on-demand", "GCP": "Sustained use discounts", "Azure": "Reserved instances"}},
      {"name": "ML/AI Services", "ratings": {"AWS": 8, "GCP": 9, "Azure": 8}, "notes": {"AWS": "SageMaker", "GCP": "Vertex AI", "Azure": "Azure ML"}},
      {"name": "Global Reach", "ratings": {"AWS": 9, "GCP": 8, "Azure": 9}, "notes": {"AWS": "33 regions", "GCP": "37 regions", "Azure": "60+ regions"}}
    ]
  }
}
</artifact>
```

**When to use:** Product comparisons, technology evaluations, decision matrices.

---

## Updating Existing Artifacts

To update an artifact from a previous message, reuse the same `id`:

**Message 1:**
```xml
<artifact id="artifact_1" type="code" title="Data Processor v1">
def process(data):
    return [x * 2 for x in data]
</artifact>
```

**Message 3 (later in conversation):**
```xml
<artifact id="artifact_1" type="code" title="Data Processor v2">
def process(data, multiplier=2):
    """Process data with configurable multiplier."""
    return [x * multiplier for x in data]
</artifact>
```

This creates a new **version** of `artifact_1`. The system tracks the version chain and users can browse history.

---

## When NOT to Use Artifacts

- **Short code snippets** in explanations — use regular ` ``` ` code blocks
- **Simple lists or tables** — use regular markdown
- **Inline examples** — keep them in prose
- **Thinking/reasoning** — use `<thinking>` tags
- **Trivial content** that doesn't benefit from persistence or rich rendering

**Rule of thumb:** Use an artifact when the content is a self-contained deliverable that the user would want to save, share, revisit, or interact with.

---

## Multiple Artifacts in One Message

Artifacts are numbered sequentially per message. Reset the counter for each new message.

```
Here's your study material:

<artifact id="artifact_1" type="flashcards" title="Vocabulary">
Front: Ephemeral
Back: Lasting for a very short time.
</artifact>

And here's a quiz to test yourself:

<artifact id="artifact_2" type="quiz" title="Vocabulary Quiz">
{
  "quiz_title": "Vocabulary Quiz",
  "multiple_choice": [
    {
      "question": "What does 'ephemeral' mean?",
      "options": ["Lasting forever", "Lasting a short time", "Very large", "Very small"],
      "correct_answer": "Lasting a short time"
    }
  ]
}
</artifact>
```

---

## Content Guidelines

1. **Artifacts must be complete and self-contained.** The content should work on its own without the surrounding prose.
2. **HTML artifacts should include all necessary styling.** Don't rely on external stylesheets or scripts.
3. **JSON artifacts must be valid JSON.** No comments, trailing commas, or placeholder text like `[array of items]`.
4. **Titles should be descriptive but concise.** 3-8 words. They appear in the canvas library.
5. **Match the type to the content.** Don't put HTML in a `code` artifact or JSON in an `html` artifact.

---

## Complete Type Reference

| Type | Content Format | Use Case |
|------|---------------|----------|
| `iframe` | Full HTML document | Dashboards, visualizations, interactive tools |
| `code` | Source code (any language) | Scripts, configs, reference implementations |
| `html` | HTML fragment | Styled cards, layouts, rich content |
| `diagram` | JSON (`{"diagram": {...}}`) | Flowcharts, architectures, ERDs |
| `flashcards` | Markdown (Front/Back pairs) | Study decks, vocabulary, review material |
| `quiz` | JSON (`{"quiz_title": ...}`) | Assessments, knowledge tests |
| `presentation` | JSON (`{"presentation": {...}}`) | Slide decks, business reviews |
| `timeline` | Markdown in `<timeline>` | Roadmaps, history, milestones |
| `research` | Markdown in `<research>` | Reports, analysis, literature reviews |
| `comparison` | JSON (`{"comparison": {...}}`) | Product/tech evaluations |
| `image` | Image URL or base64 | Generated images, charts |
| `troubleshooting` | Markdown in `<troubleshooting>` | Debug guides, FAQ, issue resolution |
| `resources` | Markdown in `<resources>` | Link collections, reading lists |
