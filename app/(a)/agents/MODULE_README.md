# `app.(a).agents` — Module Overview

> This document is partially auto-generated. Sections tagged `<!-- AUTO:id -->` are refreshed by the generator.
> Everything else is yours to edit freely and will never be overwritten.

<!-- AUTO:meta -->
## About This Document

This file is **partially auto-generated**. Sections wrapped in `<!-- AUTO:id -->` tags
are overwritten each time the generator runs. Everything else is yours to edit freely.

| Field | Value |
|-------|-------|
| Module | `app/(a)/agents` |
| Last generated | 2026-04-10 20:05 |
| Output file | `app/(a)/agents/MODULE_README.md` |
| Signature mode | `signatures` |

**To refresh auto-sections:**
```bash
python utils/code_context/generate_module_readme.py app/(a)/agents --mode signatures
```

**To add permanent notes:** Write anywhere outside the `<!-- AUTO:... -->` blocks.
<!-- /AUTO:meta -->

<!-- HUMAN-EDITABLE: This section is yours. Agents & Humans can edit this section freely — it will not be overwritten. -->

## Architecture

> **Fill this in.** Describe the execution flow and layer map for this module.
> See `utils/code_context/MODULE_README_SPEC.md` for the recommended format.
>
> Suggested structure:
>
> ### Layers
> | File | Role |
> |------|------|
> | `entry.py` | Public entry point — receives requests, returns results |
> | `engine.py` | Core dispatch logic |
> | `models.py` | Shared data types |
>
> ### Call Flow (happy path)
> ```
> entry_function() → engine.dispatch() → implementation()
> ```


<!-- AUTO:tree -->
## Directory Tree

> Auto-generated. 16 files across 5 directories.

```
app/(a)/agents/
├── [id]/
│   ├── [version]/
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   ├── page.tsx
│   ├── error.tsx
│   ├── latest/
│   │   ├── loading.tsx
│   │   ├── page.tsx
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   ├── run/
│   │   ├── loading.tsx
│   │   ├── page.tsx
├── error.tsx
├── layout.tsx
├── loading.tsx
├── page.tsx
# excluded: 3 .md
```
<!-- /AUTO:tree -->

<!-- AUTO:signatures -->
## API Signatures

> Auto-generated via `output_mode="signatures"`. ~5-10% token cost vs full source.
> For full source, open the individual files directly.

```
---
Filepath: app/(a)/agents/layout.tsx  [typescript/react]

  # Components
    [Component] export default function AgentsLayout({ children }: { children: React.ReactNode })


---
Filepath: app/(a)/agents/error.tsx  [typescript/react]

  # Components
    [Component] export default function AgentsListError({ error, reset, }: { error: Error & { digest?: string }; reset: ()


---
Filepath: app/(a)/agents/loading.tsx  [typescript/react]

  # Components
    [Component] export default function AgentsListLoading()


---
Filepath: app/(a)/agents/page.tsx  [typescript/react]



---
Filepath: app/(a)/agents/[id]/layout.tsx  [typescript/react]

  # Utilities
    export async function generateMetadata({ params, }: { params: Promise<{ id: string }>; })


---
Filepath: app/(a)/agents/[id]/error.tsx  [typescript/react]

  # Components
    [Component] export default function AgentError({ error, reset, }: { error: Error & { digest?: string }; reset: ()


---
Filepath: app/(a)/agents/[id]/loading.tsx  [typescript/react]

  # Components
    [Component] export default function AgentDetailLoading()


---
Filepath: app/(a)/agents/[id]/page.tsx  [typescript/react]



---
Filepath: app/(a)/agents/[id]/not-found.tsx  [typescript/react]

  # Components
    [Component] export default function AgentNotFound()


---
Filepath: app/(a)/agents/[id]/latest/loading.tsx  [typescript/react]

  # Components
    [Component] export default function AgentVersionsLoading()


---
Filepath: app/(a)/agents/[id]/latest/page.tsx  [typescript/react]



---
Filepath: app/(a)/agents/[id]/[version]/loading.tsx  [typescript/react]

  # Components
    [Component] export default function AgentVersionLoading()


---
Filepath: app/(a)/agents/[id]/[version]/page.tsx  [typescript/react]

  # Utilities
    export async function generateMetadata({ params, }: { params: Promise<{ id: string; version: string }>; })


---
Filepath: app/(a)/agents/[id]/[version]/not-found.tsx  [typescript/react]

  # Components
    [Component] export default function VersionNotFound()


---
Filepath: app/(a)/agents/[id]/run/loading.tsx  [typescript/react]

  # Components
    [Component] export default function AgentRunLoading()


---
Filepath: app/(a)/agents/[id]/run/page.tsx  [typescript/react]
```
<!-- /AUTO:signatures -->

<!-- AUTO:config -->
## Generation Config

> Auto-managed. Contains the exact parameters used to generate this README.
> Used by parent modules to auto-refresh this file when it is stale.
> Do not edit manually — changes will be overwritten on the next run.

```json
{
  "subdirectory": "app/(a)/agents",
  "mode": "signatures",
  "scope": null,
  "project_noise": null,
  "include_call_graph": true,
  "entry_points": null,
  "call_graph_exclude": [
    "tests"
  ]
}
```
<!-- /AUTO:config -->
