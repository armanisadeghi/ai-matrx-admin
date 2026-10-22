// features/visual-map-lab/subjects.data.ts
//
// The six 2026-10-19 test subjects (Archify vs Mermaid) — the system samples every signed-in person sees.
// Source of truth: platform files, index file 7634d379-8a3f-4c65-8c88-eced5801b77e (collection
// system-files/docs-artifacts/legible-diagrams-2026-10-19/legible-diagrams-samples/); the specs also sit in
// aidream/apps/shared/diagrams/test/fixtures/subjects. Only the small, always-needed parts are embedded here
// (spec, Mermaid source, the agent's round report); the large engine outputs are read on demand by file id.
// Generated from files.json by the lane that built the lab; regenerate by re-running that export, never hand-edit.

export interface SubjectVariantData {
  variant: "archify" | "archify-sonnet";
  spec: Record<string, unknown>;
  agentReport: Record<string, unknown> | null;
  specFileId: string | null;
  fileIds: { validate?: string; layout?: string; visualCheck?: string };
}
export interface SubjectData {
  id: string;
  title: string;
  mermaid: string | null;
  mermaidReport: Record<string, unknown> | null;
  mermaidFileId: string | null;
  variants: SubjectVariantData[];
}

export const SUBJECTS_INDEX_FILE_ID = "7634d379-8a3f-4c65-8c88-eced5801b77e";

export const SUBJECTS: SubjectData[] = [
 {
  "id": "S1",
  "title": "Architecture: the AI Matrx platform",
  "mermaid": "flowchart LR\n    subgraph Clients[\"Clients\"]\n        FE[\"matrx-frontend<br/>Next.js 16 / React 19<br/>AI Matrx\"]\n        EXT[\"matrx-extend<br/>Chrome extension\"]\n        LOC[\"matrx-local<br/>Tauri v2 desktop app\"]\n    end\n\n    DB[(\"ONE Supabase Postgres<br/>db.matrxserver.com\")]\n\n    subgraph Server[\"aidream: Python 3.13 / FastAPI\"]\n        API[\"server.app.matrxserver.com<br/>AI, agents, workflows, files\"]\n    end\n\n    PROV[\"Model providers via matrx-ai<br/>OpenAI, Anthropic, Gemini, xAI,<br/>Groq, Together, Cerebras, Ollama, more\"]\n    SBX[\"matrx-sandbox<br/>isolated agent machines\"]\n    SHIP[\"matrx-ship<br/>deploy and infra control plane\"]\n\n    FE -- \"direct reads and writes<br/>supabase-js + RLS\" --> DB\n    EXT -- \"direct data\" --> DB\n    LOC -- \"direct data\" --> DB\n    API -- \"Matrx ORM\" --> DB\n\n    FE -- \"AI, agents, workflows\" --> API\n    EXT -- \"SSE runs, tool dispatch\" --> API\n    LOC -- \"AI and heavy work\" --> API\n\n    API --> PROV\n    FE -- \"tier picked at create\" --> SBX\n    SHIP -. \"deploys and manages\" .-> API\n",
  "mermaidReport": {
   "path": "mermaid",
   "subject": "S1",
   "rounds": [
    {
     "round": 1,
     "ok": true,
     "top_issue": "Top-down layout with subgraph and long note crowded the render; bottom cropped and edge labels hard to follow"
    },
    {
     "round": 2,
     "ok": true,
     "top_issue": "Left-to-right layout fits; some edges cross near aidream and the matrx-extend direct-data edge passes through the server area"
    }
   ],
   "first_pass_ok": true,
   "final_ok": true,
   "notes": "Two rounds: the first pass checked ok but was cropped and crowded, so I switched to a left-to-right layout and dropped the long note; the final diagram is legible with only minor edge crossings."
  },
  "mermaidFileId": "c5c19561-6725-4654-8f62-a0a29ae7c82f",
  "variants": [
   {
    "variant": "archify",
    "spec": {
     "schema_version": 1,
     "diagram_type": "architecture",
     "meta": {
      "title": "AI Matrx platform: pieces and connections",
      "subtitle": "Clients read and write one Supabase Postgres directly; aidream does the AI and heavy work",
      "output": "diagram.html",
      "quality_profile": "showcase"
     },
     "components": [
      {
       "id": "users",
       "type": "external",
       "label": "Users",
       "sublabel": "Browser / Mobile",
       "pos": [
        40,
        220
       ],
       "size": [
        150,
        64
       ]
      },
      {
       "id": "frontend",
       "type": "frontend",
       "label": "matrx-frontend",
       "sublabel": "AI Matrx · Next.js 16 / React 19",
       "pos": [
        300,
        220
       ],
       "size": [
        170,
        70
       ],
       "tag": "Supabase · Redux · Stripe · Vercel"
      },
      {
       "id": "aidream",
       "type": "backend",
       "label": "aidream",
       "sublabel": "Python 3.13 / FastAPI · ECS/Fargate us-east-1",
       "pos": [
        560,
        220
       ],
       "size": [
        170,
        70
       ]
      },
      {
       "id": "providers",
       "type": "external",
       "label": "Model providers",
       "sublabel": "OpenAI, Anthropic, Google GenAI and more",
       "pos": [
        820,
        220
       ],
       "size": [
        170,
        70
       ]
      },
      {
       "id": "extend",
       "type": "frontend",
       "label": "matrx-extend",
       "sublabel": "Chrome extension · WXT MV3",
       "pos": [
        300,
        60
       ],
       "size": [
        170,
        64
       ]
      },
      {
       "id": "ship",
       "type": "cloud",
       "label": "matrx-ship",
       "sublabel": "deploy · versions · infra control plane",
       "pos": [
        40,
        60
       ],
       "size": [
        170,
        64
       ]
      },
      {
       "id": "db",
       "type": "database",
       "label": "Supabase Postgres",
       "sublabel": "db.matrxserver.com · one database",
       "pos": [
        560,
        400
       ],
       "size": [
        170,
        70
       ],
       "tag": "RLS on every table"
      },
      {
       "id": "local",
       "type": "frontend",
       "label": "matrx-local",
       "sublabel": "Tauri v2 desktop · Python sidecar",
       "pos": [
        820,
        400
       ],
       "size": [
        170,
        64
       ]
      },
      {
       "id": "sandbox",
       "type": "cloud",
       "label": "matrx-sandbox",
       "sublabel": "isolated agent machines · EC2 or hosted",
       "pos": [
        300,
        400
       ],
       "size": [
        170,
        70
       ]
      }
     ],
     "connections": [
      {
       "id": "user-to-frontend",
       "from": "users",
       "to": "frontend",
       "label": "HTTPS",
       "variant": "emphasis"
      },
      {
       "id": "frontend-to-db",
       "from": "frontend",
       "to": "db",
       "label": "supabase-js, direct with RLS",
       "variant": "emphasis",
       "fromSide": "bottom",
       "toSide": "left"
      },
      {
       "id": "frontend-to-aidream",
       "from": "frontend",
       "to": "aidream",
       "label": "AI, agents, workflows"
      },
      {
       "id": "aidream-to-providers",
       "from": "aidream",
       "to": "providers",
       "label": "model calls"
      },
      {
       "id": "aidream-to-db",
       "from": "aidream",
       "to": "db",
       "label": "Matrx ORM",
       "fromSide": "bottom",
       "toSide": "top"
      },
      {
       "id": "extend-to-aidream",
       "from": "extend",
       "to": "aidream",
       "label": "SSE chat runs"
      },
      {
       "id": "local-to-aidream",
       "from": "local",
       "to": "aidream",
       "label": "AI, heavy work",
       "fromSide": "top",
       "toSide": "right",
       "variant": "dashed"
      },
      {
       "id": "local-to-db",
       "from": "local",
       "to": "db",
       "label": "direct, RLS",
       "variant": "dashed"
      },
      {
       "id": "frontend-to-sandbox",
       "from": "frontend",
       "to": "sandbox",
       "label": "create, picks tier",
       "variant": "dashed",
       "fromSide": "bottom",
       "toSide": "top"
      }
     ],
     "cards": [
      {
       "dot": "cyan",
       "title": "Data path",
       "items": [
        "Clients read and write Supabase directly under RLS",
        "The Python server is not a data middle tier"
       ]
      },
      {
       "dot": "emerald",
       "title": "Server work",
       "items": [
        "aidream runs all AI, agents, workflows and files",
        "Model calls go through one unified client over 12+ SDKs"
       ]
      },
      {
       "dot": "violet",
       "title": "Clients",
       "items": [
        "matrx-extend streams from aidream and writes data direct",
        "matrx-local adds about 80 local tools on a sidecar"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S1",
     "rounds": [
      {
       "round": 1,
       "errors": 1,
       "warnings": 0,
       "top_issue": "db sublabel overflow (needs 170px, box 162px)"
      },
      {
       "round": 2,
       "errors": 0,
       "warnings": 0,
       "top_issue": "none; validate ok (advisory: 3 routes over suggested bends)"
      }
     ],
     "first_pass_ok": false,
     "final_ok": true,
     "deliver_ok": true,
     "notes": "Brief's 'Fast authoring path' heading does not exist in SKILL.md; followed its Native diagram authoring steps, used the architecture schema, common schema and web-app showcase example, and skipped the update check."
    },
    "fileIds": {
     "validate": "34be680c-6120-414b-a9e6-e026a35d9a45",
     "layout": "1010989c-4a4b-4715-b80d-3c2c9aa10a63",
     "visualCheck": "beef8b62-eab3-4b6b-a373-14d7afe768ab"
    },
    "specFileId": "dc1c5ec5-d43f-4397-ae52-00071dc1da8d"
   }
  ]
 },
 {
  "id": "S2",
  "title": "Sequence: a user sends a chat message to an agent",
  "mermaid": "sequenceDiagram\n    autonumber\n    participant C as Client\n    participant MW as Middleware\n    participant SA as start_agent\n    participant DB as Database\n    participant ST as Stream\n    participant LP as run_ai_task loop\n    participant M as Model provider\n    participant T as Tools\n\n    C->>MW: POST /ai/agents/{agent_id} (alias /ai/agent/{agent_id})\n    Note over MW: CORS, request log, AuthMiddleware validates JWT\n    MW->>MW: Build AppContext with new request_id (cx_user_request id)\n    MW->>SA: Route to start_agent (aidream/api/routers/agents.py)\n\n    SA->>DB: Load agent config from agx_* tables, apply scope\n    SA->>DB: Resolve conversation: INSERT cx_conversation if new, verify if existing (404/409)\n    SA->>SA: Variable replacement, merge tools (apply_unified_tools) and context objects\n    opt Persistence on\n        SA->>DB: INSERT cx_user_request (status pending)\n    end\n\n    SA->>ST: create_streaming_response opens NDJSON stream\n    ST-->>C: phase \"connected\"\n    ST-->>C: conversation id, record_reserved (cx_conversation, cx_user_request)\n\n    ST->>LP: run_ai_task creates operation_id\n    LP-->>C: phase \"processing\" and init event\n    LP->>LP: execute_ai_request, then execute_until_complete\n\n    loop Up to 20 iterations, 2 retries per iteration\n        LP->>DB: Reserve ids for cx_message and cx_request\n        LP->>M: Call model through unified client\n        M-->>C: chunks, data and tool events streamed\n        alt Server tool call\n            LP->>T: Run server tool inside loop\n            T-->>LP: Result feeds next iteration\n        else Client tool call\n            LP->>DB: cx_tool_call rows marked delegated\n            LP-->>C: Turn ends, suspended_awaiting_client\n            C->>LP: POST /conversations/{id}/tool_results\n            C->>LP: POST /conversations/{id}/resume\n        end\n    end\n\n    LP->>DB: persist_completed_request updates cx_conversation and cx_user_request\n    LP->>DB: Write cx_message, cx_request (one per iteration), cx_tool_call rows\n    LP-->>C: completion event with operation_id\n    LP-->>C: end of stream\n",
  "mermaidReport": {
   "path": "mermaid",
   "subject": "S2",
   "rounds": [
    {
     "round": 1,
     "ok": true,
     "top_issue": "Self-message labels and long arrow labels cross lifelines; cosmetic only, all steps legible"
    }
   ],
   "first_pass_ok": true,
   "final_ok": true,
   "notes": "One sequenceDiagram covering the start_agent flow from middleware through the loop, client tool suspend/resume, persistence and completion, using only the supplied facts; checker passed on the first round."
  },
  "mermaidFileId": "42807c8c-e84f-4579-b3f8-1ddb43922fc2",
  "variants": [
   {
    "variant": "archify",
    "spec": {
     "schema_version": 1,
     "diagram_type": "sequence",
     "meta": {
      "title": "Agent Run Request Lifecycle",
      "output": "diagram.html",
      "viewBox": [
       820,
       820
      ],
      "animation": "trace",
      "visual_preset": "signal-flow",
      "quality_profile": "showcase"
     },
     "participants": [
      {
       "id": "client",
       "type": "external",
       "label": "Client",
       "sublabel": "streams NDJSON"
      },
      {
       "id": "mw",
       "type": "security",
       "label": "Middleware",
       "sublabel": "CORS, log, JWT"
      },
      {
       "id": "start",
       "type": "backend",
       "label": "start_agent",
       "sublabel": "routers/agents.py"
      },
      {
       "id": "db",
       "type": "database",
       "label": "Postgres",
       "sublabel": "agx_* and cx_* tables"
      },
      {
       "id": "runner",
       "type": "backend",
       "label": "run_ai_task",
       "sublabel": "stream and loop"
      },
      {
       "id": "model",
       "type": "cloud",
       "label": "Model provider",
       "sublabel": "unified client"
      }
     ],
     "segments": [
      {
       "from": 170,
       "to": 290,
       "label": "Accept"
      },
      {
       "from": 306,
       "to": 400,
       "label": "Open stream"
      },
      {
       "from": 406,
       "to": 690,
       "label": "Loop and persist"
      }
     ],
     "messages": [
      {
       "from": "client",
       "to": "mw",
       "y": 180,
       "label": "POST /ai/agents/{agent_id}",
       "variant": "emphasis"
      },
      {
       "from": "mw",
       "to": "start",
       "y": 220,
       "label": "JWT valid, AppContext + request_id",
       "variant": "default"
      },
      {
       "from": "start",
       "to": "db",
       "y": 260,
       "label": "load agent config, resolve conversation",
       "variant": "default"
      },
      {
       "from": "start",
       "to": "db",
       "y": 300,
       "label": "INSERT cx_user_request pending",
       "variant": "emphasis"
      },
      {
       "from": "start",
       "to": "client",
       "y": 340,
       "label": "connected, conversation + record_reserved",
       "variant": "return"
      },
      {
       "from": "start",
       "to": "runner",
       "y": 380,
       "label": "run_ai_task opens operation",
       "variant": "emphasis"
      },
      {
       "from": "runner",
       "to": "model",
       "y": 420,
       "label": "reserve ids, execute_until_complete",
       "variant": "emphasis"
      },
      {
       "from": "model",
       "to": "runner",
       "y": 460,
       "label": "chunks, data, tool events",
       "variant": "return"
      },
      {
       "from": "runner",
       "to": "client",
       "y": 500,
       "label": "stream chunks to client",
       "variant": "default"
      },
      {
       "from": "runner",
       "to": "client",
       "y": 540,
       "label": "client tool: suspended_awaiting_client",
       "variant": "dashed"
      },
      {
       "from": "client",
       "to": "runner",
       "y": 580,
       "label": "POST /conversations/{id}/tool_results, then /resume",
       "variant": "default"
      },
      {
       "from": "runner",
       "to": "db",
       "y": 630,
       "label": "persist_completed_request writes cx_message, cx_request, cx_tool_call",
       "variant": "emphasis"
      },
      {
       "from": "runner",
       "to": "client",
       "y": 680,
       "label": "completion event with operation_id",
       "variant": "return"
      }
     ],
     "activations": [
      {
       "participant": "mw",
       "from": 174,
       "to": 226,
       "type": "security"
      },
      {
       "participant": "start",
       "from": 214,
       "to": 346,
       "type": "backend"
      },
      {
       "participant": "db",
       "from": 254,
       "to": 306,
       "type": "database"
      },
      {
       "participant": "runner",
       "from": 374,
       "to": 690,
       "type": "backend"
      },
      {
       "participant": "model",
       "from": 414,
       "to": 466,
       "type": "cloud"
      }
     ],
     "cards": [
      {
       "dot": "cyan",
       "title": "Entry",
       "items": [
        "Every request gets a request_id before the agent loads",
        "Config, conversation, and request rows are resolved first"
       ]
      },
      {
       "dot": "orange",
       "title": "Client Tools",
       "items": [
        "Client tool calls suspend the turn",
        "Resume continues the same loop after tool results"
       ]
      },
      {
       "dot": "emerald",
       "title": "Settled",
       "items": [
        "Rows persist once the turn completes",
        "The stream closes after the completion event"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S2",
     "rounds": [
      {
       "round": 1,
       "errors": 2,
       "warnings": 0,
       "top_issue": "Accept segment bottom edge at y 300 runs along INSERT cx_user_request message at y 300"
      },
      {
       "round": 2,
       "errors": 0,
       "warnings": 1,
       "top_issue": "composition/viewport-height warning only, 820x820 canvas; not an error so validate passed"
      }
     ],
     "first_pass_ok": false,
     "final_ok": true,
     "deliver_ok": true,
     "notes": "Validate round 1 failed on one segment-edge collision; moving the Accept edge from y 300 to 290 passed round 2 with one non-blocking viewport-height warning, and deliver succeeded. The SKILL.md has no section titled Fast authoring path, so I followed the brief's schema, common schema and example steps instead."
    },
    "fileIds": {
     "validate": "b76940ee-2ca4-408a-9d46-0379c2cde8b0",
     "visualCheck": "cfc90eae-5b5e-461d-bddf-f0d49960176a"
    },
    "specFileId": "330d7580-ea7c-4784-b02d-31bf9d36e5a1"
   }
  ]
 },
 {
  "id": "S3",
  "title": "Workflow: Study Pack v2 (turn study material into a study kit)",
  "mermaid": "flowchart LR\n    IN[\"Inputs: pasted text, file, URL<br/>vars: topic, audience, difficulty, focus\"]\n    MAT[\"1. materials\"]\n    BS[\"2. build_sources\"]\n    ING[\"3. ingest<br/>2000/200 chunks\"]\n    GS[\"4. grounded_source<br/>### Chunk chunk_id\"]\n\n    IN --> MAT --> BS --> ING --> GS\n\n    subgraph GEN[\"5. Parallel generators\"]\n        direction TB\n        FC[\"flashcards: flashcard_set\"]\n        QZ[\"quiz: quiz_set\"]\n        PT[\"practice_test: quiz_set\"]\n        MM[\"mind_map: diagram_spec\"]\n        MA[\"memory_aid: memory_aid\"]\n        NT[\"notes\"]\n        SM[\"summary\"]\n    end\n\n    GS --> GEN\n\n    subgraph LES[\"6. Lesson branch\"]\n        direction TB\n        ING2[\"ingest\"] --> STR[\"structure: knowledge doc\"] --> KT[\"knowledge_text\"] --> LS[\"lessons: lesson_script_set\"]\n    end\n\n    GS --> ING2\n\n    subgraph KIT[\"7. Kit identity\"]\n        direction TB\n        AN[\"anchor: kit id\"]\n        KS[\"kit_sample: first 4000 chars\"]\n        KTI[\"kit_title\"]\n    end\n\n    GS --> AN\n    GS --> KS\n    GS --> KTI\n\n    GP[\"gaps: records reason\"]\n    PK[\"8. pack<br/>12 fields, join: all\"]\n\n    GEN --> PK\n    LS --> PK\n    KS --> PK\n    AN --> PK\n    KTI --> PK\n\n    GEN -. \"ERROR\" .-> GP\n    AN -. \"ERROR\" .-> GP\n    KTI -. \"ERROR\" .-> GP\n    GP --> PK\n\n    PS[\"9. persist<br/>rows linked to anchor<br/>/education/kits/anchor_id\"]\n    SH[\"10. show<br/>pack + manifest\"]\n\n    PK --> PS --> SH\n    KTI -. \"fails: humanized filename\" .-> PS\n    PS -. \"ERROR: still shows pack\" .-> SH\n\n    NOTE[\"Audio deferred (8th artifact). No retry_policy set.\"]:::note\n\n    classDef note fill:#fff8e1,stroke:#b58900,color:#333\n",
  "mermaidReport": {
   "path": "mermaid",
   "subject": "S3",
   "rounds": [
    {
     "round": 1,
     "ok": true,
     "top_issue": "Tall layout cropped by the 1440x900 screenshot; node text small"
    },
    {
     "round": 2,
     "ok": true,
     "top_issue": "Whole graph fits; text small and ERROR edges dense but readable"
    }
   ],
   "first_pass_ok": true,
   "final_ok": true,
   "notes": "Flowchart of study_pack_v2 with all named nodes, the error-to-gaps routing and the persist-to-show error edge; two check rounds, both ok."
  },
  "mermaidFileId": "4453f097-f436-43db-9bcb-f006c25fc395",
  "variants": [
   {
    "variant": "archify",
    "spec": {
     "schema_version": 2,
     "diagram_type": "workflow",
     "meta": {
      "title": "Study Pack v2 Workflow",
      "subtitle": "Inputs to a persisted study kit",
      "animation": "trace",
      "visual_preset": "signal-flow",
      "quality_profile": "showcase",
      "output": "diagram.html"
     },
     "lanes": [
      {
       "id": "intake",
       "label": "Intake"
      },
      {
       "id": "sources",
       "label": "Source prep"
      },
      {
       "id": "gen",
       "label": "Parallel generators"
      },
      {
       "id": "lesson",
       "label": "Lesson branch"
      },
      {
       "id": "kit",
       "label": "Kit identity"
      },
      {
       "id": "assemble",
       "label": "Assemble & persist"
      },
      {
       "id": "failure",
       "label": "Failure routing",
       "variant": "exception"
      },
      {
       "id": "delivery",
       "label": "Delivery"
      }
     ],
     "mainPath": [
      "materials",
      "build_sources",
      "ingest",
      "grounded_source",
      "flashcards",
      "pack",
      "persist",
      "show"
     ],
     "nodes": [
      {
       "id": "materials",
       "lane": "intake",
       "col": 0,
       "type": "external",
       "label": "materials",
       "sublabel": "form: text, file, URL",
       "tag": "nothing required",
       "width": 132
      },
      {
       "id": "build_sources",
       "lane": "sources",
       "col": 1,
       "type": "backend",
       "label": "build_sources",
       "sublabel": "source list",
       "width": 132
      },
      {
       "id": "ingest",
       "lane": "sources",
       "col": 2,
       "type": "backend",
       "label": "ingest",
       "sublabel": "2000-char chunks, 200 overlap",
       "tag": "not persisted",
       "width": 132
      },
      {
       "id": "grounded_source",
       "lane": "sources",
       "col": 3,
       "type": "backend",
       "label": "grounded_source",
       "sublabel": "### Chunk <chunk_id>",
       "width": 132
      },
      {
       "id": "flashcards",
       "lane": "gen",
       "col": 4,
       "type": "backend",
       "label": "flashcards",
       "sublabel": "flashcard_set",
       "width": 132,
       "yOffset": -210
      },
      {
       "id": "quiz",
       "lane": "gen",
       "col": 4,
       "type": "backend",
       "label": "quiz",
       "sublabel": "quiz_set",
       "width": 132,
       "yOffset": -140
      },
      {
       "id": "practice_test",
       "lane": "gen",
       "col": 4,
       "type": "backend",
       "label": "practice_test",
       "sublabel": "quiz_set",
       "width": 132,
       "yOffset": -70
      },
      {
       "id": "mind_map",
       "lane": "gen",
       "col": 4,
       "type": "backend",
       "label": "mind_map",
       "sublabel": "diagram_spec",
       "width": 132,
       "yOffset": 0
      },
      {
       "id": "memory_aid",
       "lane": "gen",
       "col": 4,
       "type": "backend",
       "label": "memory_aid",
       "sublabel": "memory_aid",
       "width": 132,
       "yOffset": 70
      },
      {
       "id": "notes",
       "lane": "gen",
       "col": 4,
       "type": "backend",
       "label": "notes",
       "sublabel": "not kind-bound",
       "width": 132,
       "yOffset": 140
      },
      {
       "id": "summary",
       "lane": "gen",
       "col": 4,
       "type": "backend",
       "label": "summary",
       "sublabel": "not kind-bound",
       "width": 132,
       "yOffset": 210
      },
      {
       "id": "structure",
       "lane": "lesson",
       "col": 3,
       "type": "backend",
       "label": "structure",
       "sublabel": "knowledge document",
       "width": 132
      },
      {
       "id": "knowledge_text",
       "lane": "lesson",
       "col": 4,
       "type": "backend",
       "label": "knowledge_text",
       "width": 132
      },
      {
       "id": "lessons",
       "lane": "lesson",
       "col": 5,
       "type": "backend",
       "label": "lessons",
       "sublabel": "lesson_script_set",
       "width": 132
      },
      {
       "id": "anchor",
       "lane": "kit",
       "col": 1,
       "type": "database",
       "label": "anchor",
       "sublabel": "durable file = kit id",
       "width": 132
      },
      {
       "id": "kit_sample",
       "lane": "kit",
       "col": 2,
       "type": "backend",
       "label": "kit_sample",
       "sublabel": "first 4000 chars",
       "width": 132
      },
      {
       "id": "kit_title",
       "lane": "kit",
       "col": 3,
       "type": "backend",
       "label": "kit_title",
       "sublabel": "names the kit",
       "width": 132
      },
      {
       "id": "gaps",
       "lane": "failure",
       "col": 3,
       "type": "security",
       "label": "gaps",
       "sublabel": "records each failure reason",
       "width": 132
      },
      {
       "id": "pack",
       "lane": "assemble",
       "col": 4,
       "type": "backend",
       "label": "pack",
       "sublabel": "twelve fields",
       "tag": "gaps + sources_summary",
       "width": 132
      },
      {
       "id": "persist",
       "lane": "assemble",
       "col": 5,
       "type": "database",
       "label": "persist",
       "sublabel": "rows linked to anchor",
       "width": 132
      },
      {
       "id": "show",
       "lane": "delivery",
       "col": 5,
       "type": "frontend",
       "label": "show",
       "sublabel": "pack + manifest",
       "width": 132
      }
     ],
     "edges": [
      {
       "id": "e-materials-build",
       "from": "materials",
       "to": "build_sources",
       "variant": "default"
      },
      {
       "id": "e-build-ingest",
       "from": "build_sources",
       "to": "ingest",
       "variant": "default"
      },
      {
       "id": "e-ingest-grounded",
       "from": "ingest",
       "to": "grounded_source",
       "variant": "default"
      },
      {
       "id": "e-grounded-flash",
       "from": "grounded_source",
       "to": "flashcards",
       "variant": "emphasis"
      },
      {
       "id": "e-grounded-quiz",
       "from": "grounded_source",
       "to": "quiz",
       "variant": "default"
      },
      {
       "id": "e-grounded-practice",
       "from": "grounded_source",
       "to": "practice_test",
       "variant": "default"
      },
      {
       "id": "e-grounded-mind",
       "from": "grounded_source",
       "to": "mind_map",
       "variant": "default"
      },
      {
       "id": "e-grounded-memory",
       "from": "grounded_source",
       "to": "memory_aid",
       "variant": "default"
      },
      {
       "id": "e-grounded-notes",
       "from": "grounded_source",
       "to": "notes",
       "variant": "default"
      },
      {
       "id": "e-grounded-summary",
       "from": "grounded_source",
       "to": "summary",
       "variant": "default"
      },
      {
       "id": "e-ingest-structure",
       "from": "ingest",
       "to": "structure",
       "label": "lesson branch",
       "variant": "dashed"
      },
      {
       "id": "e-structure-knowledge",
       "from": "structure",
       "to": "knowledge_text",
       "variant": "dashed"
      },
      {
       "id": "e-knowledge-lessons",
       "from": "knowledge_text",
       "to": "lessons",
       "variant": "dashed"
      },
      {
       "id": "e-build-anchor",
       "from": "build_sources",
       "to": "anchor",
       "label": "file or saved .md",
       "variant": "default"
      },
      {
       "id": "e-anchor-sample",
       "from": "anchor",
       "to": "kit_sample",
       "variant": "default"
      },
      {
       "id": "e-anchor-title",
       "from": "anchor",
       "to": "kit_title",
       "variant": "default"
      },
      {
       "id": "e-flash-pack",
       "from": "flashcards",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-quiz-pack",
       "from": "quiz",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-practice-pack",
       "from": "practice_test",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-mind-pack",
       "from": "mind_map",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-memory-pack",
       "from": "memory_aid",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-notes-pack",
       "from": "notes",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-summary-pack",
       "from": "summary",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-lessons-pack",
       "from": "lessons",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-sample-pack",
       "from": "kit_sample",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "e-flash-err",
       "from": "flashcards",
       "to": "gaps",
       "role": "error",
       "variant": "security"
      },
      {
       "id": "e-quiz-err",
       "from": "quiz",
       "to": "gaps",
       "role": "error",
       "variant": "security"
      },
      {
       "id": "e-practice-err",
       "from": "practice_test",
       "to": "gaps",
       "role": "error",
       "variant": "security"
      },
      {
       "id": "e-mind-err",
       "from": "mind_map",
       "to": "gaps",
       "role": "error",
       "variant": "security"
      },
      {
       "id": "e-memory-err",
       "from": "memory_aid",
       "to": "gaps",
       "role": "error",
       "variant": "security"
      },
      {
       "id": "e-notes-err",
       "from": "notes",
       "to": "gaps",
       "role": "error",
       "variant": "security"
      },
      {
       "id": "e-summary-err",
       "from": "summary",
       "to": "gaps",
       "role": "error",
       "variant": "security"
      },
      {
       "id": "e-anchor-err",
       "from": "anchor",
       "to": "gaps",
       "role": "error",
       "variant": "security"
      },
      {
       "id": "e-title-err",
       "from": "kit_title",
       "to": "gaps",
       "role": "error",
       "variant": "security",
       "label": "humanized filename"
      },
      {
       "id": "e-gaps-pack",
       "from": "gaps",
       "to": "pack",
       "role": "branch",
       "variant": "dashed",
       "label": "slot null"
      },
      {
       "id": "e-title-persist",
       "from": "kit_title",
       "to": "persist",
       "variant": "default"
      },
      {
       "id": "e-anchor-persist",
       "from": "anchor",
       "to": "persist",
       "variant": "default",
       "label": "linked"
      },
      {
       "id": "e-pack-persist",
       "from": "pack",
       "to": "persist",
       "variant": "emphasis"
      },
      {
       "id": "e-persist-show",
       "from": "persist",
       "to": "show",
       "variant": "emphasis"
      },
      {
       "id": "e-persist-err",
       "from": "persist",
       "to": "show",
       "role": "error",
       "variant": "security",
       "label": "crash: show pack"
      }
     ],
     "cards": [
      {
       "dot": "cyan",
       "title": "Grounding",
       "items": [
        "Every chunk is marked so agents can cite it",
        "Generators read the same marked text in parallel"
       ]
      },
      {
       "dot": "rose",
       "title": "Failure Routing",
       "items": [
        "Each generator, anchor and kit_title errors into gaps",
        "Pack still fires with the failed slot null"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S3",
     "rounds": [
      {
       "round": 1,
       "errors": 6,
       "warnings": 0,
       "top_issue": "workflow/node-overlap: generator nodes stacked 30px apart in lane gen (min 8px clearance, nodes 52px tall)"
      },
      {
       "round": 2,
       "errors": 145,
       "warnings": 0,
       "top_issue": "composition/ambiguous-corridor: grounded_source fan-out and generator error edges share corridors (122 ambiguous-corridor, 12 proper-crossing, 11 arrowhead-collision)"
      },
      {
       "round": 3,
       "errors": 145,
       "warnings": 0,
       "top_issue": "same as round 2 after widening generator yOffset spacing to 70px; count unchanged"
      }
     ],
     "first_pass_ok": false,
     "final_ok": false,
     "deliver_ok": false,
     "notes": "Stopped after round 3 because two consecutive rounds did not lower the error count; SKILL.md has no 'Fast authoring path' section, so I followed its Native diagram authoring steps and the workflow schema plus example instead, and deliver failed at render with no diagram.html produced."
    },
    "fileIds": {
     "validate": "2df01f51-bed8-4f07-a622-b3ae05d69e3b",
     "layout": "376cc4a5-db43-4f0d-a643-e21c1599bc91"
    },
    "specFileId": "44a117d0-af66-4836-a409-f070f0885c01"
   },
   {
    "variant": "archify-sonnet",
    "spec": {
     "schema_version": 2,
     "diagram_type": "workflow",
     "meta": {
      "title": "study_pack_v2 workflow",
      "quality_profile": "showcase",
      "output": "diagram.html"
     },
     "lanes": [
      {
       "id": "fail",
       "label": "Failure handling",
       "variant": "exception"
      },
      {
       "id": "g1",
       "label": "Generator 1"
      },
      {
       "id": "g2",
       "label": "Generator 2"
      },
      {
       "id": "g3",
       "label": "Generator 3"
      },
      {
       "id": "chain",
       "label": "Ingest, grounding, pack"
      },
      {
       "id": "g5",
       "label": "Generator 5"
      },
      {
       "id": "g6",
       "label": "Generator 6"
      },
      {
       "id": "g7",
       "label": "Generator 7"
      },
      {
       "id": "les",
       "label": "Lesson branch"
      },
      {
       "id": "kit",
       "label": "Anchor and title"
      },
      {
       "id": "per",
       "label": "Persist"
      },
      {
       "id": "shw",
       "label": "Show"
      }
     ],
     "mainPath": [
      "materials",
      "build_sources",
      "ingest",
      "grounded_source",
      "mind_map",
      "pack",
      "persist",
      "show"
     ],
     "nodes": [
      {
       "id": "materials",
       "lane": "chain",
       "col": 0,
       "type": "frontend",
       "label": "materials",
       "sublabel": "user input form",
       "tag": "nothing required"
      },
      {
       "id": "build_sources",
       "lane": "chain",
       "col": 1,
       "type": "backend",
       "label": "build_sources",
       "sublabel": "text / file / URL"
      },
      {
       "id": "ingest",
       "lane": "chain",
       "col": 2,
       "type": "backend",
       "label": "ingest",
       "sublabel": "2000-char chunks, 200 overlap",
       "tag": "not persisted"
      },
      {
       "id": "grounded_source",
       "lane": "chain",
       "col": 3,
       "type": "backend",
       "label": "grounded_source",
       "sublabel": "### Chunk <chunk_id>"
      },
      {
       "id": "flashcards",
       "lane": "g1",
       "col": 4,
       "type": "backend",
       "label": "flashcards",
       "sublabel": "flashcard_set"
      },
      {
       "id": "quiz",
       "lane": "g2",
       "col": 4,
       "type": "backend",
       "label": "quiz",
       "sublabel": "quiz_set"
      },
      {
       "id": "practice_test",
       "lane": "g3",
       "col": 4,
       "type": "backend",
       "label": "practice_test",
       "sublabel": "quiz_set"
      },
      {
       "id": "mind_map",
       "lane": "chain",
       "col": 4,
       "type": "backend",
       "label": "mind_map",
       "sublabel": "diagram_spec"
      },
      {
       "id": "memory_aid",
       "lane": "g5",
       "col": 4,
       "type": "backend",
       "label": "memory_aid",
       "sublabel": "memory_aid"
      },
      {
       "id": "notes",
       "lane": "g6",
       "col": 4,
       "type": "backend",
       "label": "notes",
       "sublabel": "not kind-bound"
      },
      {
       "id": "summary",
       "lane": "g7",
       "col": 4,
       "type": "backend",
       "label": "summary",
       "sublabel": "not kind-bound"
      },
      {
       "id": "structure",
       "lane": "les",
       "col": 2,
       "type": "backend",
       "label": "structure",
       "sublabel": "knowledge document"
      },
      {
       "id": "knowledge_text",
       "lane": "les",
       "col": 3,
       "type": "backend",
       "label": "knowledge_text"
      },
      {
       "id": "lessons",
       "lane": "les",
       "col": 4,
       "type": "backend",
       "label": "lessons",
       "sublabel": "lesson_script_set"
      },
      {
       "id": "anchor",
       "lane": "kit",
       "col": 0,
       "type": "database",
       "label": "anchor",
       "sublabel": "durable file = kit id"
      },
      {
       "id": "kit_sample",
       "lane": "kit",
       "col": 1,
       "type": "backend",
       "label": "kit_sample",
       "sublabel": "first 4000 chars"
      },
      {
       "id": "kit_title",
       "lane": "kit",
       "col": 2,
       "type": "backend",
       "label": "kit_title",
       "sublabel": "names the kit"
      },
      {
       "id": "gaps",
       "lane": "fail",
       "col": 5,
       "type": "security",
       "label": "gaps",
       "sublabel": "records the reason"
      },
      {
       "id": "pack",
       "lane": "chain",
       "col": 5,
       "type": "backend",
       "label": "pack",
       "sublabel": "twelve fields",
       "tag": "join: all"
      },
      {
       "id": "persist",
       "lane": "per",
       "col": 5,
       "type": "database",
       "label": "persist",
       "sublabel": "rows linked to anchor"
      },
      {
       "id": "show",
       "lane": "shw",
       "col": 5,
       "type": "frontend",
       "label": "show",
       "sublabel": "pack + manifest"
      }
     ],
     "edges": [
      {
       "id": "materials-build_sources",
       "from": "materials",
       "to": "build_sources",
       "variant": "emphasis"
      },
      {
       "id": "build_sources-ingest",
       "from": "build_sources",
       "to": "ingest",
       "variant": "emphasis",
       "label": "sources"
      },
      {
       "id": "ingest-grounded_source",
       "from": "ingest",
       "to": "grounded_source",
       "variant": "emphasis"
      },
      {
       "id": "grounded_source-flashcards",
       "from": "grounded_source",
       "to": "flashcards",
       "variant": "default"
      },
      {
       "id": "grounded_source-quiz",
       "from": "grounded_source",
       "to": "quiz",
       "variant": "default"
      },
      {
       "id": "grounded_source-practice_test",
       "from": "grounded_source",
       "to": "practice_test",
       "variant": "default"
      },
      {
       "id": "grounded_source-mind_map",
       "from": "grounded_source",
       "to": "mind_map",
       "variant": "default"
      },
      {
       "id": "grounded_source-memory_aid",
       "from": "grounded_source",
       "to": "memory_aid",
       "variant": "default"
      },
      {
       "id": "grounded_source-notes",
       "from": "grounded_source",
       "to": "notes",
       "variant": "default"
      },
      {
       "id": "grounded_source-summary",
       "from": "grounded_source",
       "to": "summary",
       "variant": "default"
      },
      {
       "id": "ingest-structure",
       "from": "ingest",
       "to": "structure",
       "variant": "dashed",
       "role": "branch"
      },
      {
       "id": "structure-knowledge_text",
       "from": "structure",
       "to": "knowledge_text",
       "variant": "dashed"
      },
      {
       "id": "knowledge_text-lessons",
       "from": "knowledge_text",
       "to": "lessons",
       "variant": "dashed"
      },
      {
       "id": "lessons-pack",
       "from": "lessons",
       "to": "pack",
       "variant": "dashed"
      },
      {
       "id": "materials-anchor",
       "from": "materials",
       "to": "anchor",
       "variant": "dashed"
      },
      {
       "id": "anchor-kit_sample",
       "from": "anchor",
       "to": "kit_sample",
       "variant": "dashed"
      },
      {
       "id": "kit_sample-kit_title",
       "from": "kit_sample",
       "to": "kit_title",
       "variant": "dashed"
      },
      {
       "id": "flashcards-pack",
       "from": "flashcards",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "flashcards-gaps",
       "from": "flashcards",
       "to": "gaps",
       "variant": "security",
       "role": "error",
       "fromSide": "right",
       "toSide": "right",
       "route": "outside-right"
      },
      {
       "id": "quiz-pack",
       "from": "quiz",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "quiz-gaps",
       "from": "quiz",
       "to": "gaps",
       "variant": "security",
       "role": "error",
       "fromSide": "right",
       "toSide": "right",
       "route": "outside-right"
      },
      {
       "id": "practice_test-pack",
       "from": "practice_test",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "practice_test-gaps",
       "from": "practice_test",
       "to": "gaps",
       "variant": "security",
       "role": "error",
       "fromSide": "right",
       "toSide": "right",
       "route": "outside-right"
      },
      {
       "id": "mind_map-pack",
       "from": "mind_map",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "mind_map-gaps",
       "from": "mind_map",
       "to": "gaps",
       "variant": "security",
       "role": "error"
      },
      {
       "id": "memory_aid-pack",
       "from": "memory_aid",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "memory_aid-gaps",
       "from": "memory_aid",
       "to": "gaps",
       "variant": "security",
       "role": "error",
       "fromSide": "right",
       "toSide": "right",
       "route": "outside-right"
      },
      {
       "id": "notes-pack",
       "from": "notes",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "notes-gaps",
       "from": "notes",
       "to": "gaps",
       "variant": "security",
       "role": "error",
       "fromSide": "right",
       "toSide": "right",
       "route": "outside-right"
      },
      {
       "id": "summary-pack",
       "from": "summary",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "summary-gaps",
       "from": "summary",
       "to": "gaps",
       "variant": "security",
       "role": "error",
       "fromSide": "right",
       "toSide": "right",
       "route": "outside-right"
      },
      {
       "id": "anchor-gaps",
       "from": "anchor",
       "to": "gaps",
       "variant": "security",
       "role": "error"
      },
      {
       "id": "kit_title-gaps",
       "from": "kit_title",
       "to": "gaps",
       "variant": "security",
       "role": "error"
      },
      {
       "id": "kit_title-pack",
       "from": "kit_title",
       "to": "pack",
       "variant": "default"
      },
      {
       "id": "gaps-pack",
       "from": "gaps",
       "to": "pack",
       "variant": "security"
      },
      {
       "id": "pack-persist",
       "from": "pack",
       "to": "persist",
       "variant": "emphasis"
      },
      {
       "id": "persist-show",
       "from": "persist",
       "to": "show",
       "variant": "emphasis"
      },
      {
       "id": "persist-show-error",
       "from": "persist",
       "to": "show",
       "variant": "security",
       "label": "error",
       "role": "error"
      }
     ],
     "cards": [
      {
       "dot": "rose",
       "title": "Failure handling",
       "items": [
        "Generators, anchor and kit_title have an ERROR edge into gaps",
        "pack (join all: resolved, at least one delivered) still fires with that slot null",
        "persist error edge into show; kit_title failure falls back to a humanized filename",
        "No retry_policy set in this file; audio deferred (8th artifact)"
       ]
      },
      {
       "dot": "cyan",
       "title": "Kit",
       "items": [
        "Attached file is the anchor; pasted text becomes a saved .md",
        "Kit appears at /education/kits/{anchor_id}"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S3",
     "rounds": [
      {
       "round": 1,
       "errors": 0,
       "warnings": 0,
       "top_issue": "many proper-crossing (count not captured, output truncated)"
      },
      {
       "round": 2,
       "errors": 53,
       "warnings": 0,
       "top_issue": "composition/proper-crossing from 7 generators each fanning into both pack and gaps"
      },
      {
       "round": 3,
       "errors": 1,
       "warnings": 0,
       "top_issue": "outside-right preset violates label clearance"
      },
      {
       "round": 4,
       "errors": 1,
       "warnings": 0,
       "top_issue": "outside-right intersects pack node"
      },
      {
       "round": 5,
       "errors": 1,
       "warnings": 0,
       "top_issue": "explicit mind_map-gaps geometry crosses another explicit route"
      },
      {
       "round": 6,
       "errors": 1,
       "warnings": 0,
       "top_issue": "explicit practice_test-gaps geometry route-route crossing"
      }
     ],
     "first_pass_ok": false,
     "final_ok": false,
     "deliver_ok": false,
     "notes": "Seven generators each feeding both pack and gaps cannot be laid out crossing-free in the six-column workflow grid; round 1 error count was not captured and rounds 3-6 report only the first hard error."
    },
    "fileIds": {
     "validate": "75816f1d-1d55-4cd3-aebd-9a3be2272a53",
     "layout": "caf91558-6691-459d-a88c-9c5f1c91d4a5"
    },
    "specFileId": "89475fc1-d038-44f5-a54c-4e686bed61f2"
   }
  ]
 },
 {
  "id": "S4",
  "title": "Lifecycle: a workflow run (workflow.run.status)",
  "mermaid": "stateDiagram-v2\n    direction LR\n    [*] --> pending\n    pending --> running: worker claims queued run\n    pending --> awaiting_input: start missing required input\n    awaiting_input --> running: values supplied\n\n    running --> pausing: POST pause\n    pausing --> paused: scheduler sees it between super-steps\n    paused --> running: POST resume-paused\n\n    running --> cancelling: POST cancel (graceful or immediate)\n    cancelling --> cancelled: graceful waits up to one super-step, immediate cancels task\n\n    running --> interrupted: node raises GraphInterrupt\n    interrupted --> running: POST resume with checkpoint and value\n\n    running --> errored: node fails after its attempts\n    errored --> running: retry node, skip, manual-result, or resume-errored\n\n    running --> completed: happy path\n    running --> failed: framework error (compile, max_steps, scheduler exception)\n\n    completed --> [*]\n    failed --> [*]\n    cancelled --> [*]\n\n    note right of completed\n      Terminal: completed, failed, cancelled.\n      Immutable; re-run via fork-from creates a new run.\n    end note\n    note left of paused\n      Parked and recoverable:\n      paused, interrupted, awaiting_input, errored.\n      Resume claims are atomic (second racer gets 409).\n    end note\n",
  "mermaidReport": {
   "path": "mermaid",
   "subject": "S4",
   "rounds": [
    {
     "round": 1,
     "ok": true,
     "top_issue": "Long edge labels and a wide LR layout make the right side cramped; the errored recovery edge is hard to trace back to running"
    }
   ],
   "first_pass_ok": true,
   "final_ok": true,
   "notes": "Single-pass diagram passes the checker and is readable; all status names and transitions from the brief are included, with terminal and parked states noted."
  },
  "mermaidFileId": "709b935d-7097-46b3-9b13-25de0adb0eb1",
  "variants": [
   {
    "variant": "archify",
    "spec": {
     "schema_version": 3,
     "diagram_type": "lifecycle",
     "meta": {
      "title": "Workflow Run Status Lifecycle",
      "subtitle": "wf_run_status: every state a workflow run can hold",
      "output": "diagram.html",
      "animation": "trace",
      "visual_preset": "signal-flow",
      "quality_profile": "showcase"
     },
     "mainPath": [
      "pending",
      "running",
      "completed"
     ],
     "states": [
      {
       "id": "pending",
       "type": "start",
       "label": "Pending",
       "sublabel": "run queued",
       "tag": "queued",
       "step": "01"
      },
      {
       "id": "running",
       "type": "active",
       "label": "Running",
       "sublabel": "super-steps executing",
       "tag": "active",
       "step": "02"
      },
      {
       "id": "awaiting_input",
       "type": "waiting",
       "label": "Awaiting Input",
       "sublabel": "required input missing",
       "tag": "parked"
      },
      {
       "id": "pausing",
       "type": "active",
       "label": "Pausing",
       "sublabel": "pause requested",
       "tag": "control"
      },
      {
       "id": "paused",
       "type": "waiting",
       "label": "Paused",
       "sublabel": "held between super-steps",
       "tag": "parked"
      },
      {
       "id": "cancelling",
       "type": "active",
       "label": "Cancelling",
       "sublabel": "cancel requested",
       "tag": "control"
      },
      {
       "id": "interrupted",
       "type": "waiting",
       "label": "Interrupted",
       "sublabel": "human-in-the-loop",
       "tag": "parked"
      },
      {
       "id": "errored",
       "type": "waiting",
       "label": "Errored",
       "sublabel": "node failed after attempts",
       "tag": "recoverable"
      },
      {
       "id": "completed",
       "type": "success",
       "label": "Completed",
       "sublabel": "happy path",
       "tag": "terminal",
       "step": "03"
      },
      {
       "id": "failed",
       "type": "failure",
       "label": "Failed",
       "sublabel": "framework error",
       "tag": "terminal"
      },
      {
       "id": "cancelled",
       "type": "neutral",
       "label": "Cancelled",
       "sublabel": "immutable",
       "tag": "terminal"
      }
     ],
     "transitions": [
      {
       "id": "pending-running",
       "from": "pending",
       "to": "running",
       "label": "claimed"
      },
      {
       "id": "pending-awaiting",
       "from": "pending",
       "to": "awaiting_input",
       "label": "missing required input",
       "variant": "dashed"
      },
      {
       "id": "awaiting-running",
       "from": "awaiting_input",
       "to": "running",
       "label": "values supplied"
      },
      {
       "id": "running-pausing",
       "from": "running",
       "to": "pausing",
       "label": "POST pause"
      },
      {
       "id": "pausing-paused",
       "from": "pausing",
       "to": "paused",
       "label": "observed between super-steps"
      },
      {
       "id": "paused-running",
       "from": "paused",
       "to": "running",
       "label": "resume-paused"
      },
      {
       "id": "running-cancelling",
       "from": "running",
       "to": "cancelling",
       "label": "POST cancel",
       "variant": "security"
      },
      {
       "id": "cancelling-cancelled",
       "from": "cancelling",
       "to": "cancelled",
       "label": "graceful or immediate"
      },
      {
       "id": "running-interrupted",
       "from": "running",
       "to": "interrupted",
       "label": "GraphInterrupt",
       "variant": "dashed"
      },
      {
       "id": "interrupted-running",
       "from": "interrupted",
       "to": "running",
       "label": "POST resume"
      },
      {
       "id": "running-errored",
       "from": "running",
       "to": "errored",
       "label": "node fails",
       "variant": "dashed"
      },
      {
       "id": "errored-running",
       "from": "errored",
       "to": "running",
       "label": "retry or skip"
      },
      {
       "id": "running-completed",
       "from": "running",
       "to": "completed",
       "label": "success",
       "variant": "emphasis"
      },
      {
       "id": "running-failed",
       "from": "running",
       "to": "failed",
       "label": "compile, max_steps, scheduler error",
       "variant": "security"
      }
     ],
     "cards": [
      {
       "dot": "cyan",
       "title": "Terminal States",
       "items": [
        "Completed, failed and cancelled runs are immutable",
        "A finished run is re-run through fork-from, which creates a new run"
       ]
      },
      {
       "dot": "amber",
       "title": "Parked and Recoverable",
       "items": [
        "Paused, interrupted, awaiting input and errored runs can resume",
        "Resume claims are atomic; a second racer gets 409"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S4",
     "rounds": [
      {
       "round": 1,
       "errors": 1,
       "warnings": 0,
       "top_issue": "lifecycle too wide: 2046px vs 1395px budget, driven by long transition labels on errored routes"
      },
      {
       "round": 2,
       "errors": 1,
       "warnings": 0,
       "top_issue": "lifecycle too wide: 1626px, driven by main-path labels claimed and success (+8px each)"
      },
      {
       "round": 3,
       "errors": 1,
       "warnings": 0,
       "top_issue": "lifecycle too wide: 1626px, same two main-path labels still +8px each"
      }
     ],
     "first_pass_ok": false,
     "final_ok": false,
     "deliver_ok": false,
     "notes": "Stopped after round 3 under the two-rounds-without-lower-error-count rule; the width overflow is 231px and the deliver step failed with the same lifecycle/too-wide error, so no HTML was produced."
    },
    "fileIds": {
     "validate": "fe8b19a9-2966-4956-a489-3a91c1c0a949"
    },
    "specFileId": "f357cd20-51cf-4a4e-8e91-538766c9a636"
   },
   {
    "variant": "archify-sonnet",
    "spec": {
     "schema_version": 3,
     "diagram_type": "lifecycle",
     "meta": {
      "title": "Workflow Run Status Lifecycle",
      "subtitle": "wf_run_status_check (migration 0111): 11 status values",
      "output": "diagram.html",
      "animation": "trace",
      "quality_profile": "showcase"
     },
     "mainPath": [
      "pending",
      "running",
      "completed"
     ],
     "states": [
      {
       "id": "pending",
       "type": "start",
       "label": "pending",
       "sublabel": "queued run",
       "tag": "entry",
       "step": "01"
      },
      {
       "id": "running",
       "type": "active",
       "label": "running",
       "sublabel": "in-step retries stay",
       "tag": "work",
       "step": "02"
      },
      {
       "id": "completed",
       "type": "success",
       "label": "completed",
       "sublabel": "terminal, immutable",
       "tag": "terminal",
       "step": "03"
      },
      {
       "id": "awaiting_input",
       "type": "waiting",
       "label": "awaiting_input",
       "sublabel": "input missing",
       "tag": "parked"
      },
      {
       "id": "pausing",
       "type": "active",
       "label": "pausing",
       "sublabel": "control",
       "tag": "request"
      },
      {
       "id": "paused",
       "type": "waiting",
       "label": "paused",
       "sublabel": "parked",
       "tag": "parked"
      },
      {
       "id": "cancelling",
       "type": "active",
       "label": "cancelling",
       "sublabel": "control",
       "tag": "request"
      },
      {
       "id": "cancelled",
       "type": "neutral",
       "label": "cancelled",
       "sublabel": "terminal",
       "tag": "terminal"
      },
      {
       "id": "interrupted",
       "type": "waiting",
       "label": "interrupted",
       "sublabel": "HITL",
       "tag": "parked"
      },
      {
       "id": "errored",
       "type": "waiting",
       "label": "errored",
       "sublabel": "in checkpoint",
       "tag": "recoverable"
      },
      {
       "id": "failed",
       "type": "failure",
       "label": "failed",
       "sublabel": "terminal",
       "tag": "terminal"
      }
     ],
     "transitions": [
      {
       "id": "pending-running",
       "from": "pending",
       "to": "running",
       "label": "claim"
      },
      {
       "id": "running-completed",
       "from": "running",
       "to": "completed",
       "label": "ok"
      },
      {
       "id": "pending-awaiting",
       "from": "pending",
       "to": "awaiting_input",
       "label": "input missing",
       "variant": "dashed"
      },
      {
       "id": "awaiting-running",
       "from": "awaiting_input",
       "to": "running",
       "label": "values supplied"
      },
      {
       "id": "running-pausing",
       "from": "running",
       "to": "pausing",
       "label": "POST pause"
      },
      {
       "id": "pausing-paused",
       "from": "pausing",
       "to": "paused",
       "label": "super-step end"
      },
      {
       "id": "paused-running",
       "from": "paused",
       "to": "running",
       "label": "resume-paused"
      },
      {
       "id": "running-cancelling",
       "from": "running",
       "to": "cancelling",
       "label": "POST cancel",
       "variant": "security"
      },
      {
       "id": "cancelling-cancelled",
       "from": "cancelling",
       "to": "cancelled",
       "label": "graceful/immediate",
       "variant": "security"
      },
      {
       "id": "running-interrupted",
       "from": "running",
       "to": "interrupted",
       "label": "GraphInterrupt"
      },
      {
       "id": "interrupted-running",
       "from": "interrupted",
       "to": "running",
       "label": "POST resume"
      },
      {
       "id": "running-errored",
       "from": "running",
       "to": "errored",
       "label": "fails",
       "variant": "security"
      },
      {
       "id": "errored-running",
       "from": "errored",
       "to": "running",
       "label": "retry/resume-errored",
       "variant": "dashed"
      },
      {
       "id": "running-failed",
       "from": "running",
       "to": "failed",
       "label": "framework error",
       "variant": "security"
      }
     ],
     "cards": [
      {
       "dot": "emerald",
       "title": "Terminal",
       "items": [
        "completed, failed, cancelled are immutable",
        "A finished run is re-run via fork-from, which creates a new run"
       ]
      },
      {
       "dot": "amber",
       "title": "Parked and recoverable",
       "items": [
        "paused, interrupted, awaiting_input, errored",
        "Resume claims are atomic; a second racer gets 409"
       ]
      },
      {
       "dot": "violet",
       "title": "Enum note",
       "items": [
        "Scheduler enum RunStatus omits pausing and cancelling",
        "Both are transitional control states written by a request"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S4",
     "rounds": [
      {
       "round": 1,
       "errors": 1,
       "warnings": 0,
       "top_issue": "lifecycle/too-wide 2263px vs 1395"
      },
      {
       "round": 2,
       "errors": 1,
       "warnings": 0,
       "top_issue": "too-wide 1752px"
      },
      {
       "round": 3,
       "errors": 1,
       "warnings": 0,
       "top_issue": "too-wide 1582px"
      },
      {
       "round": 4,
       "errors": 1,
       "warnings": 0,
       "top_issue": "too-wide 1442px"
      },
      {
       "round": 5,
       "errors": 1,
       "warnings": 0,
       "top_issue": "too-wide 1442px"
      },
      {
       "round": 6,
       "errors": 1,
       "warnings": 0,
       "top_issue": "too-wide 1440px"
      }
     ],
     "first_pass_ok": false,
     "final_ok": false,
     "deliver_ok": false,
     "notes": "8 non-main-path states in one lower row cannot fit the 1395px budget at showcase even with minimal labels (1440px); no HTML produced."
    },
    "fileIds": {
     "validate": "1302939a-207c-4a48-ab76-9cee6362c9d5"
    },
    "specFileId": "0acc9c15-f619-495e-ad58-8a8d2d2c18c5"
   }
  ]
 },
 {
  "id": "S5",
  "title": "Dataflow: RAG ingestion in matrx-rag",
  "mermaid": "flowchart LR\n    subgraph ENTRY[\"Entry points\"]\n        E1[\"POST /ingest (matrx-rag router)\"]\n        E2[\"run_all (stages.py)\"]\n        E3[\"rag_ingestion.py workflow (8 nodes)\"]\n    end\n\n    E1 --> S1\n    E2 --> S1\n    E3 --> S1\n\n    subgraph INGEST[\"Ingest stages: idempotent, DB in and out\"]\n        direction TB\n        S1[\"1 Extract: cloud file to raw text per page, OCR if needed\"]\n        S2[\"2 Clean: LLM page cleanup, single-flight guard\"]\n        S3[\"3 Chunk: page-aware parent and child chunks\"]\n        S4[\"4 Embed: chunks lacking a vector, batch 64\"]\n        S5[\"5 Optional NER / graph\"]\n        S1 --> S2 --> S3 --> S4 --> S5\n    end\n\n    S1 --> T1[(\"processed_document_pages.raw_text\")]\n    S2 --> T2[(\"cleaned_text + section fields\")]\n    S2 -. \"awaiting_batch, resumes later\" .-> S2\n    S3 --> T3[(\"rag.kg_chunks, SHA-256 per chunk, no vectors\")]\n    S3 -. \"re-ingest: unchanged reuse row + embedding; changed or orphaned deleted, cascading\" .-> T3\n    S4 -- \"prose default\" --> T4[(\"rag.embeddings_voyage_4_large_1024\")]\n    S4 -- \"code default\" --> T5[(\"rag.embeddings_voyage_code_3_1024\")]\n    S5 --> T6[(\"kg_entities, kg_chunk_entities\")]\n\n    subgraph READ[\"Read-back: search.py, all ACL-filtered\"]\n        direction TB\n        R1[\"Vector recall (HNSW cosine)\"]\n        R2[\"Lexical recall (tsquery)\"]\n        R3[\"Entity recall\"]\n        R4[\"RRF fusion (k=60)\"]\n        R5[\"Optional host cross-encoder rerank\"]\n        R6[\"Child hits expand to parents\"]\n        R1 --> R4\n        R2 --> R4\n        R3 --> R4\n        R4 --> R5 --> R6\n    end\n\n    T3 --> R1\n    T3 --> R2\n    T4 --> R1\n    T5 --> R1\n    T6 --> R3\n    R6 --> AUDIT[(\"rag.retrieval_audit\")]\n\n    S1 -. \"progress events\" .-> PE[\"fetch, extract, classify, cleanup, chunk, enrich, embed, upsert, graph, complete, error\"]\n",
  "mermaidReport": {
   "path": "mermaid",
   "subject": "S5",
   "rounds": [
    {
     "round": 1,
     "ok": true,
     "top_issue": "Top-to-bottom layout cropped in the rendered PNG and the ingest column ran off the canvas"
    },
    {
     "round": 2,
     "ok": true,
     "top_issue": "Switched to left-to-right layout; the render fits, though node text is small"
    },
    {
     "round": 3,
     "ok": true,
     "top_issue": "Re-ingest reuse and delete rule was missing; added as an edge label"
    }
   ],
   "first_pass_ok": true,
   "final_ok": true,
   "notes": "Three check rounds used, final source passes the checker; the rendered PNG was judged readable but small-text, and the re-ingest edge label was added in round 3 without re-viewing the PNG."
  },
  "mermaidFileId": "7e811cda-ba60-45cd-b3a6-1cc42464649c",
  "variants": [
   {
    "variant": "archify",
    "spec": {
     "schema_version": 1,
     "diagram_type": "dataflow",
     "meta": {
      "title": "RAG Ingestion and Read-back Data Flow",
      "subtitle": "Staged ingestion into rag tables, then ACL-filtered retrieval",
      "output": "diagram.html",
      "viewBox": [
       1360,
       820
      ],
      "animation": "trace",
      "quality_profile": "showcase"
     },
     "stages": [
      {
       "label": "Entry"
      },
      {
       "label": "Extract and clean"
      },
      {
       "label": "Chunk"
      },
      {
       "label": "Embed and graph"
      },
      {
       "label": "Read-back"
      }
     ],
     "nodes": [
      {
       "id": "ingest",
       "type": "backend",
       "label": "POST /ingest",
       "sublabel": "matrx-rag router",
       "stage": 0,
       "row": 0,
       "tag": "entry",
       "width": 150
      },
      {
       "id": "runner",
       "type": "backend",
       "label": "run_all",
       "sublabel": "staged runner in stages.py",
       "stage": 0,
       "row": 1,
       "tag": "entry",
       "width": 150
      },
      {
       "id": "workflow",
       "type": "backend",
       "label": "Eight-node workflow",
       "sublabel": "rag_ingestion.py",
       "stage": 0,
       "row": 2,
       "tag": "entry",
       "width": 150
      },
      {
       "id": "cloudfile",
       "type": "external",
       "label": "Cloud file",
       "sublabel": "source document",
       "stage": 0,
       "row": 3,
       "tag": "source",
       "width": 150
      },
      {
       "id": "extract",
       "type": "backend",
       "label": "Extract",
       "sublabel": "per-page raw text, OCR",
       "stage": 1,
       "row": 0,
       "tag": "stage 1",
       "width": 176
      },
      {
       "id": "pages",
       "type": "database",
       "label": "processed_document_pages",
       "sublabel": "raw_text, cleaned_text",
       "stage": 1,
       "row": 1,
       "tag": "pages",
       "width": 176
      },
      {
       "id": "clean",
       "type": "backend",
       "label": "Clean",
       "sublabel": "LLM cleanup, single-flight",
       "stage": 1,
       "row": 2,
       "tag": "stage 2",
       "width": 176
      },
      {
       "id": "batch",
       "type": "external",
       "label": "Batch lane",
       "sublabel": "status awaiting_batch",
       "stage": 1,
       "row": 3,
       "tag": "resumable",
       "width": 176
      },
      {
       "id": "chunk",
       "type": "backend",
       "label": "Chunk",
       "sublabel": "page-aware hierarchy",
       "stage": 2,
       "row": 0,
       "tag": "stage 3",
       "width": 176
      },
      {
       "id": "chunks",
       "type": "database",
       "label": "rag.kg_chunks",
       "sublabel": "no vectors, SHA-256 each",
       "stage": 2,
       "row": 1,
       "tag": "chunks",
       "width": 176
      },
      {
       "id": "embed",
       "type": "backend",
       "label": "Embed",
       "sublabel": "missing vectors, batch 64",
       "stage": 3,
       "row": 1,
       "tag": "stage 4",
       "width": 176
      },
      {
       "id": "voyageprose",
       "type": "database",
       "label": "Prose table",
       "sublabel": "voyage-4-large, 1024",
       "stage": 3,
       "row": 2,
       "tag": "vectors",
       "width": 176
      },
      {
       "id": "voyagecode",
       "type": "database",
       "label": "Code table",
       "sublabel": "voyage-code-3, 1024",
       "stage": 3,
       "row": 3,
       "tag": "vectors",
       "width": 176
      },
      {
       "id": "openai",
       "type": "database",
       "label": "OpenAI table",
       "sublabel": "per-model table",
       "stage": 3,
       "row": 4,
       "tag": "vectors",
       "width": 176
      },
      {
       "id": "ner",
       "type": "backend",
       "label": "Entity extraction",
       "sublabel": "optional LLM NER",
       "stage": 3,
       "row": 0,
       "tag": "stage 5",
       "width": 176
      },
      {
       "id": "kgtables",
       "type": "database",
       "label": "kg_entities",
       "sublabel": "kg_chunk_entities",
       "stage": 4,
       "row": 0,
       "tag": "graph",
       "width": 176
      },
      {
       "id": "search",
       "type": "backend",
       "label": "search.py",
       "sublabel": "vector, lexical, entity",
       "stage": 4,
       "row": 1,
       "tag": "ACL-filtered",
       "width": 176
      },
      {
       "id": "fusion",
       "type": "backend",
       "label": "RRF fusion",
       "sublabel": "RRF k=60, rerank optional",
       "stage": 4,
       "row": 2,
       "tag": "rank",
       "width": 176
      },
      {
       "id": "audit",
       "type": "database",
       "label": "rag.retrieval_audit",
       "sublabel": "one row per query",
       "stage": 4,
       "row": 3,
       "tag": "audit",
       "width": 176
      }
     ],
     "flows": [
      {
       "id": "cloud-to-extract",
       "from": "cloudfile",
       "to": "extract",
       "label": "file bytes",
       "classification": "source",
       "variant": "default"
      },
      {
       "id": "ingest-to-extract",
       "from": "ingest",
       "to": "extract",
       "label": "stage 1 trigger",
       "classification": "entry",
       "variant": "emphasis"
      },
      {
       "id": "runner-to-extract",
       "from": "runner",
       "to": "extract",
       "label": "stage 1 run",
       "classification": "entry",
       "variant": "default"
      },
      {
       "id": "workflow-to-extract",
       "from": "workflow",
       "to": "extract",
       "label": "parse step",
       "classification": "entry",
       "variant": "dashed"
      },
      {
       "id": "extract-to-pages",
       "from": "extract",
       "to": "pages",
       "label": "raw text per page",
       "classification": "write",
       "variant": "emphasis"
      },
      {
       "id": "pages-to-clean",
       "from": "pages",
       "to": "clean",
       "label": "page text",
       "classification": "read",
       "variant": "default"
      },
      {
       "id": "clean-to-batch",
       "from": "clean",
       "to": "batch",
       "label": "handed to batch",
       "classification": "async",
       "variant": "dashed"
      },
      {
       "id": "clean-to-chunk",
       "from": "clean",
       "to": "chunk",
       "label": "cleaned pages",
       "classification": "read",
       "variant": "emphasis"
      },
      {
       "id": "chunk-to-chunks",
       "from": "chunk",
       "to": "chunks",
       "label": "parent and child chunks",
       "classification": "write",
       "variant": "emphasis"
      },
      {
       "id": "chunks-to-embed",
       "from": "chunks",
       "to": "embed",
       "label": "chunks lacking vectors",
       "classification": "read",
       "variant": "default"
      },
      {
       "id": "embed-to-prose",
       "from": "embed",
       "to": "voyageprose",
       "label": "prose default",
       "classification": "write",
       "variant": "default",
       "route": "straight",
       "fromSide": "bottom",
       "toSide": "top"
      },
      {
       "id": "embed-to-code",
       "from": "embed",
       "to": "voyagecode",
       "label": "code default",
       "classification": "write",
       "variant": "default",
       "fromSide": "right",
       "toSide": "left"
      },
      {
       "id": "embed-to-openai",
       "from": "embed",
       "to": "openai",
       "label": "OpenAI option",
       "classification": "write",
       "variant": "dashed",
       "fromSide": "right",
       "toSide": "left"
      },
      {
       "id": "chunks-to-ner",
       "from": "chunks",
       "to": "ner",
       "label": "optional graph",
       "classification": "read",
       "variant": "dashed"
      },
      {
       "id": "ner-to-kg",
       "from": "ner",
       "to": "kgtables",
       "label": "entities and mentions",
       "classification": "write",
       "variant": "dashed"
      },
      {
       "id": "prose-to-search",
       "from": "voyageprose",
       "to": "search",
       "label": "vector recall, HNSW cosine",
       "classification": "read",
       "variant": "emphasis"
      },
      {
       "id": "code-to-search",
       "from": "voyagecode",
       "to": "search",
       "label": "vector recall",
       "classification": "read",
       "variant": "default"
      },
      {
       "id": "chunks-to-search",
       "from": "chunks",
       "to": "search",
       "label": "lexical recall, tsquery",
       "classification": "read",
       "variant": "default"
      },
      {
       "id": "kg-to-search",
       "from": "kgtables",
       "to": "search",
       "label": "entity recall",
       "classification": "read",
       "variant": "dashed"
      },
      {
       "id": "search-to-fusion",
       "from": "search",
       "to": "fusion",
       "label": "candidate hits",
       "classification": "internal",
       "variant": "emphasis"
      },
      {
       "id": "fusion-to-audit",
       "from": "fusion",
       "to": "audit",
       "label": "query audit row",
       "classification": "write",
       "variant": "security"
      }
     ],
     "cards": [
      {
       "dot": "emerald",
       "title": "Entry Points",
       "items": [
        "POST /ingest on the matrx-rag router starts ingestion",
        "run_all in stages.py runs the same stages in order",
        "The eight-node workflow in rag_ingestion.py runs resolve, parse, classify, chunk, enrich, embed, upsert and audit"
       ]
      },
      {
       "dot": "cyan",
       "title": "Stage Contract",
       "items": [
        "Each stage reads its inputs from the database and writes outputs before returning",
        "Each stage is idempotent, so re-runs reuse finished work",
        "Unchanged chunks keep their row and embedding; changed or orphaned chunks are deleted and cascade"
       ]
      },
      {
       "dot": "violet",
       "title": "Read-back",
       "items": [
        "Vector, lexical and entity recall run ACL-filtered",
        "RRF fusion with k=60, then optional host cross-encoder rerank",
        "Child hits expand to their parents; every query writes a retrieval audit row"
       ]
      },
      {
       "dot": "slate",
       "title": "Progress Events",
       "items": [
        "Stages emit fetch, extract, classify, cleanup, chunk, enrich, embed, upsert, graph, complete and error"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S5",
     "rounds": [
      {
       "round": 1,
       "errors": 1,
       "warnings": 0,
       "top_issue": "schema: stray property on node chunks"
      },
      {
       "round": 2,
       "errors": 27,
       "warnings": 0,
       "top_issue": "node sublabels wider than 104px nodes; many flow side/crossing errors (count is a lower bound, output truncated)"
      },
      {
       "round": 3,
       "errors": 47,
       "warnings": 0,
       "top_issue": "invalid row 5 on openai node; viewBox bounds on entry nodes; label overlaps"
      },
      {
       "round": 4,
       "errors": 40,
       "warnings": 0,
       "top_issue": "entry nodes exceed viewBox horizontal bounds"
      },
      {
       "round": 5,
       "errors": 36,
       "warnings": 0,
       "top_issue": "embed-to-prose endpoint sides not honored (vertical fan-out)"
      },
      {
       "round": 6,
       "errors": 38,
       "warnings": 0,
       "top_issue": "embed-to-code explicit right/left sides not honored; label clearance on fan-out labels"
      }
     ],
     "first_pass_ok": false,
     "final_ok": false,
     "deliver_ok": false,
     "notes": "Validation never passed (6 rounds, round 6 rose from 36 to 38); deliver failed on the same flow-side error so no HTML was written; the brief's 'Fast authoring path' heading does not exist in SKILL.md, so I followed its 'Native diagram authoring' steps instead; round 2 count was truncated in output, so its number is a lower bound."
    },
    "fileIds": {
     "validate": "6f212ce5-73a3-4225-b434-4fd6d437415b"
    },
    "specFileId": "540208b0-e917-44c4-804d-799529d3d33d"
   },
   {
    "variant": "archify-sonnet",
    "spec": {
     "schema_version": 1,
     "diagram_type": "dataflow",
     "meta": {
      "title": "RAG Ingestion and Read-back Data Flow",
      "output": "diagram.html",
      "quality_profile": "showcase"
     },
     "stages": [
      {
       "label": "Entry points"
      },
      {
       "label": "Extract + Clean"
      },
      {
       "label": "Chunk + Embed + NER"
      },
      {
       "label": "Stores (rag schema)"
      },
      {
       "label": "Read-back"
      }
     ],
     "nodes": [
      {
       "id": "ingest",
       "type": "frontend",
       "label": "POST /ingest",
       "sublabel": "matrx-rag router",
       "stage": 0,
       "row": 0
      },
      {
       "id": "runner",
       "type": "backend",
       "label": "run_all",
       "sublabel": "stages.py",
       "stage": 0,
       "row": 1
      },
      {
       "id": "wf",
       "type": "backend",
       "label": "rag_ingestion.py",
       "sublabel": "8-node workflow",
       "stage": 0,
       "row": 2,
       "tag": "aidream/workflows"
      },
      {
       "id": "extract",
       "type": "backend",
       "label": "Extract",
       "sublabel": "OCR where needed",
       "stage": 1,
       "row": 1
      },
      {
       "id": "clean",
       "type": "backend",
       "label": "Clean",
       "sublabel": "single-flight guard",
       "stage": 1,
       "row": 2
      },
      {
       "id": "batch",
       "type": "cloud",
       "label": "Batch lane",
       "sublabel": "awaiting_batch",
       "stage": 1,
       "row": 3
      },
      {
       "id": "graph",
       "type": "backend",
       "label": "NER / graph",
       "sublabel": "LLM entities",
       "stage": 2,
       "row": 1,
       "tag": "optional"
      },
      {
       "id": "chunk",
       "type": "backend",
       "label": "Chunk",
       "sublabel": "parent 1500 / child 300",
       "stage": 2,
       "row": 2,
       "tag": "SHA-256 reuse"
      },
      {
       "id": "embed",
       "type": "backend",
       "label": "Embed",
       "sublabel": "only missing vectors",
       "stage": 2,
       "row": 3,
       "tag": "batch 64"
      },
      {
       "id": "pages",
       "type": "database",
       "label": "processed_document_pages",
       "sublabel": "raw_text, cleaned_text",
       "stage": 3,
       "row": 0,
       "width": 170
      },
      {
       "id": "ent",
       "type": "database",
       "label": "kg_entities",
       "sublabel": "kg_chunk_entities",
       "stage": 3,
       "row": 1
      },
      {
       "id": "kgc",
       "type": "database",
       "label": "rag.kg_chunks",
       "sublabel": "no vectors at write",
       "stage": 3,
       "row": 2
      },
      {
       "id": "emb",
       "type": "database",
       "label": "Embedding tables",
       "sublabel": "per model, voyage-4-large",
       "stage": 3,
       "row": 3
      },
      {
       "id": "search",
       "type": "backend",
       "label": "search.py",
       "sublabel": "RRF k=60, ACL-filtered",
       "stage": 4,
       "row": 2
      },
      {
       "id": "audit",
       "type": "database",
       "label": "rag.retrieval_audit",
       "sublabel": "audit row",
       "stage": 4,
       "row": 0
      }
     ],
     "flows": [
      {
       "from": "ingest",
       "to": "extract",
       "label": "cloud file",
       "variant": "emphasis",
       "route": "vertical-channel",
       "channelX": 168
      },
      {
       "from": "runner",
       "to": "extract",
       "label": "staged run",
       "variant": "emphasis",
       "route": "straight",
       "labelDx": 10
      },
      {
       "from": "wf",
       "to": "extract",
       "label": "resolve, parse",
       "variant": "default",
       "route": "vertical-channel",
       "channelX": 168
      },
      {
       "from": "extract",
       "to": "pages",
       "label": "raw_text",
       "variant": "emphasis",
       "route": "top-channel"
      },
      {
       "from": "extract",
       "to": "clean",
       "label": "page text",
       "variant": "emphasis",
       "fromSide": "bottom",
       "toSide": "top",
       "labelAt": [
        315,
        328
       ]
      },
      {
       "from": "clean",
       "to": "batch",
       "label": "awaiting_batch",
       "variant": "dashed",
       "fromSide": "bottom",
       "toSide": "top",
       "labelAt": [
        315,
        442
       ]
      },
      {
       "from": "clean",
       "to": "chunk",
       "label": "cleaned_text",
       "variant": "emphasis",
       "route": "straight"
      },
      {
       "from": "chunk",
       "to": "kgc",
       "label": "chunks, no vector",
       "variant": "emphasis",
       "route": "straight"
      },
      {
       "from": "chunk",
       "to": "embed",
       "label": "missing vectors",
       "variant": "emphasis",
       "fromSide": "bottom",
       "toSide": "top",
       "labelAt": [
        530,
        442
       ]
      },
      {
       "from": "embed",
       "to": "emb",
       "label": "voyage vectors",
       "variant": "emphasis",
       "route": "straight"
      },
      {
       "from": "chunk",
       "to": "graph",
       "label": "chunk text",
       "variant": "dashed",
       "route": "straight"
      },
      {
       "from": "graph",
       "to": "ent",
       "label": "entities",
       "variant": "dashed",
       "route": "straight"
      },
      {
       "from": "kgc",
       "to": "search",
       "label": "tsquery",
       "variant": "default",
       "route": "straight"
      },
      {
       "from": "emb",
       "to": "search",
       "label": "HNSW cosine",
       "variant": "default",
       "route": "vertical-channel",
       "channelX": 885
      },
      {
       "from": "ent",
       "to": "search",
       "label": "entity recall",
       "variant": "default",
       "route": "vertical-channel",
       "channelX": 885,
       "labelDx": -50
      },
      {
       "from": "search",
       "to": "audit",
       "label": "audit row",
       "variant": "security",
       "route": "vertical-channel"
      }
     ],
     "cards": [
      {
       "dot": "amber",
       "title": "Stage contract",
       "items": [
        "Each stage reads inputs from the DB and writes outputs before returning",
        "Every stage is idempotent",
        "Batch lane pages resume later"
       ]
      },
      {
       "dot": "emerald",
       "title": "Re-ingest",
       "items": [
        "Unchanged chunks reuse their row and embedding via content SHA-256",
        "Changed or orphaned chunks are deleted, cascading to embeddings, entity mentions, edges"
       ]
      },
      {
       "dot": "rose",
       "title": "Read-back",
       "items": [
        "Vector, lexical and entity recall, all ACL-filtered",
        "RRF fusion, optional host cross-encoder rerank",
        "Child hits expand to their parents"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S5",
     "rounds": [
      {
       "round": 1,
       "errors": 1,
       "warnings": 0,
       "top_issue": "label wider than node"
      },
      {
       "round": 2,
       "errors": 6,
       "warnings": 0,
       "top_issue": "labels overlap nodes / label-route clearance"
      },
      {
       "round": 3,
       "errors": 5,
       "warnings": 0,
       "top_issue": "labels overlap nodes on stacked edges"
      },
      {
       "round": 4,
       "errors": 5,
       "warnings": 0,
       "top_issue": "labels overlap nodes on stacked edges"
      },
      {
       "round": 5,
       "errors": 1,
       "warnings": 0,
       "top_issue": "label-route clearance entity recall"
      },
      {
       "round": 6,
       "errors": 0,
       "warnings": 0,
       "top_issue": "none"
      }
     ],
     "first_pass_ok": false,
     "final_ok": true,
     "deliver_ok": true,
     "notes": "Passed on sixth validate round; error count did not fall on round 4 but the next change fixed it."
    },
    "fileIds": {
     "validate": "55857cf8-244d-4d2a-a350-d9a8185a7494",
     "visualCheck": "7ddeb25c-5ca5-47be-9d78-f396cb59be1c"
    },
    "specFileId": "94e35f0b-cc30-4d6a-a2e1-16e6af06eaa7"
   }
  ]
 },
 {
  "id": "S6",
  "title": "Workflow (plain language): how a study kit gets made",
  "mermaid": "flowchart LR\n    A[\"1. You give material<br/>text, file, or link\"] --> B[\"2. Read and split<br/>into labeled pieces<br/>counts read and unread sources\"]\n    B --> C[\"3. Make study tools<br/>flashcards, quiz, practice test,<br/>mind map, memory aids,<br/>notes, summary\"]\n    B --> D[\"4. Separate track<br/>outline, then spoken-style<br/>lesson scripts\"]\n    A --> E[\"5. Save as kit item<br/>name from opening text<br/>fallback: cleaned file name\"]\n    C --> F[\"6. One study pack<br/>failed tool left empty,<br/>missing items listed\"]\n    D --> F\n    E --> F\n    F --> G[\"7. Save to account<br/>kit stays available later\"]\n    G --> H[\"8. Show pack and<br/>save note<br/>pack shows even if save fails\"]\n    H -.- X[\"Spoken-audio version:<br/>not part of this yet\"]\n",
  "mermaidReport": {
   "path": "mermaid",
   "subject": "S6",
   "rounds": [
    {
     "round": 1,
     "ok": true,
     "top_issue": "Top-down layout made narrow tall nodes and the render was clipped at the bottom"
    },
    {
     "round": 2,
     "ok": true,
     "top_issue": "None blocking; switched to left-to-right with shorter labels, whole diagram visible"
    }
   ],
   "first_pass_ok": true,
   "final_ok": true,
   "notes": "Eight-step flowchart with parallel study-tool and outline tracks converging into one pack, with the spoken-audio item shown as not yet built."
  },
  "mermaidFileId": "86b2ebc7-e0a8-4877-a617-ee98086b3da7",
  "variants": [
   {
    "variant": "archify",
    "spec": {
     "schema_version": 2,
     "diagram_type": "workflow",
     "meta": {
      "title": "Study pack build workflow",
      "subtitle": "From your material to a saved, shown study pack",
      "quality_profile": "showcase",
      "legend": {
       "entries": {
        "external": {
         "label": "You"
        },
        "backend": {
         "label": "Processing"
        },
        "database": {
         "label": "Saved record"
        },
        "frontend": {
         "label": "Shown to you"
        }
       }
      },
      "output": "diagram.html"
     },
     "lanes": [
      {
       "id": "you",
       "label": "You"
      },
      {
       "id": "build",
       "label": "Build"
      },
      {
       "id": "script",
       "label": "Lesson track"
      },
      {
       "id": "save",
       "label": "Save"
      },
      {
       "id": "pack",
       "label": "Pack and show"
      }
     ],
     "mainPath": [
      "give",
      "split",
      "tools",
      "pack",
      "account",
      "show"
     ],
     "semanticChecks": {
      "allowedRoots": [
       "give"
      ],
      "allowedTerminals": [
       "show"
      ]
     },
     "nodes": [
      {
       "id": "give",
       "lane": "you",
       "col": 0,
       "type": "external",
       "label": "Give your material",
       "sublabel": "Paste text, attach a file, or share a link",
       "icon": "person"
      },
      {
       "id": "split",
       "lane": "build",
       "col": 1,
       "type": "backend",
       "label": "Break into labeled pieces",
       "sublabel": "Reports sources read and not read",
       "icon": "backend"
      },
      {
       "id": "tools",
       "lane": "build",
       "col": 2,
       "type": "backend",
       "label": "Make study tools at once",
       "sublabel": "Seven tools, one pass",
       "tag": "parallel",
       "icon": "briefcase"
      },
      {
       "id": "outline",
       "lane": "script",
       "col": 2,
       "type": "backend",
       "label": "Reorganize into outline",
       "sublabel": "Separate track from the study tools",
       "icon": "neutral"
      },
      {
       "id": "scripts",
       "lane": "script",
       "col": 3,
       "type": "backend",
       "label": "Write lesson scripts",
       "sublabel": "Spoken style; audio version not yet",
       "icon": "neutral"
      },
      {
       "id": "kit",
       "lane": "save",
       "col": 1,
       "type": "database",
       "label": "Save kit item",
       "sublabel": "Named from opening text, or cleaned file name",
       "tag": "meanwhile",
       "icon": "flag"
      },
      {
       "id": "pack",
       "lane": "pack",
       "col": 3,
       "type": "backend",
       "label": "Gather one study pack",
       "sublabel": "Missing tool left empty, with a reason",
       "icon": "success"
      },
      {
       "id": "account",
       "lane": "save",
       "col": 4,
       "type": "database",
       "label": "Save pack to account",
       "sublabel": "Kit stays available later",
       "icon": "success"
      },
      {
       "id": "show",
       "lane": "pack",
       "col": 4,
       "type": "frontend",
       "label": "Show finished pack",
       "sublabel": "With a note of what was saved",
       "icon": "flag"
      }
     ],
     "edges": [
      {
       "id": "give_to_split",
       "from": "give",
       "to": "split",
       "label": "Material and options",
       "role": "main"
      },
      {
       "id": "split_to_tools",
       "from": "split",
       "to": "tools",
       "label": "Labeled pieces",
       "role": "main"
      },
      {
       "id": "split_to_outline",
       "from": "split",
       "to": "outline",
       "label": "Separate track",
       "role": "async",
       "variant": "dashed"
      },
      {
       "id": "outline_to_scripts",
       "from": "outline",
       "to": "scripts",
       "label": "Outline",
       "role": "main"
      },
      {
       "id": "give_to_kit",
       "from": "give",
       "to": "kit",
       "label": "Meanwhile",
       "role": "async",
       "variant": "dashed"
      },
      {
       "id": "tools_to_pack",
       "from": "tools",
       "to": "pack",
       "label": "Finished tools",
       "role": "main"
      },
      {
       "id": "scripts_to_pack",
       "from": "scripts",
       "to": "pack",
       "label": "Lesson scripts",
       "role": "main"
      },
      {
       "id": "kit_to_account",
       "from": "kit",
       "to": "account",
       "label": "Kit identity",
       "role": "async",
       "variant": "dashed"
      },
      {
       "id": "pack_to_account",
       "from": "pack",
       "to": "account",
       "label": "Study pack",
       "role": "main"
      },
      {
       "id": "account_to_show",
       "from": "account",
       "to": "show",
       "label": "Saved",
       "role": "return"
      },
      {
       "id": "pack_to_show",
       "from": "pack",
       "to": "show",
       "label": "Shown even if save fails",
       "role": "branch",
       "variant": "dashed"
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S6",
     "rounds": [
      {
       "round": 1,
       "errors": 1,
       "warnings": 0,
       "top_issue": "schema enum: node icon 'gear' not allowed"
      },
      {
       "round": 2,
       "errors": 1,
       "warnings": 0,
       "top_issue": "layout: 'tools' sublabel needs 252px, node provides 192px"
      },
      {
       "round": 3,
       "errors": 9,
       "warnings": 0,
       "top_issue": "canvas 1301px exceeds 1240px; sublabels below 8px (after widening tools node to 260)"
      },
      {
       "round": 4,
       "errors": 9,
       "warnings": 0,
       "top_issue": "canvas 1251px exceeds 1240px; sublabels below 8px"
      },
      {
       "round": 5,
       "errors": 9,
       "warnings": 0,
       "top_issue": "canvas 1263px exceeds 1240px after moving pack/account/show to 5 columns; sublabels below 8px"
      }
     ],
     "first_pass_ok": false,
     "final_ok": false,
     "deliver_ok": false,
     "notes": "Stopped after rounds 4 and 5 did not lower the error count; canvas width stayed above 1240px and deliver failed with the same 9 sublabel-readability errors. SKILL.md has no 'Fast authoring path' section, so I followed its 'Native diagram authoring' steps and the workflow schema and example instead."
    },
    "fileIds": {
     "validate": "199bc0cb-2bb0-4144-bd86-e17dec4d0b6c",
     "layout": "856d0b72-a4a5-40ac-b902-be5bb0ccb28a"
    },
    "specFileId": "885563ce-6287-4f23-870b-2cf4021f6fc5"
   },
   {
    "variant": "archify-sonnet",
    "spec": {
     "schema_version": 2,
     "diagram_type": "workflow",
     "meta": {
      "title": "From Your Material to a Study Kit",
      "output": "diagram.html",
      "quality_profile": "showcase",
      "locale": "en"
     },
     "lanes": [
      {
       "id": "you",
       "label": "You"
      },
      {
       "id": "reading",
       "label": "Reading"
      },
      {
       "id": "tools",
       "label": "Study tools"
      },
      {
       "id": "lessons",
       "label": "Lesson track"
      },
      {
       "id": "identity",
       "label": "Kit identity"
      },
      {
       "id": "pack",
       "label": "Study pack"
      },
      {
       "id": "gaps",
       "label": "Partial results",
       "variant": "exception"
      }
     ],
     "groups": [
      {
       "id": "tools_group",
       "label": "Made at the same time",
       "lane": "tools",
       "fromCol": 2,
       "toCol": 3,
       "variant": "emphasis"
      }
     ],
     "mainPath": [
      "give",
      "read",
      "make_tools",
      "sources",
      "gather",
      "save_pack",
      "show"
     ],
     "nodes": [
      {
       "id": "give",
       "lane": "you",
       "col": 0,
       "type": "frontend",
       "label": "Give material",
       "sublabel": "text, file or link",
       "tag": "any one"
      },
      {
       "id": "read",
       "lane": "reading",
       "col": 1,
       "type": "backend",
       "label": "Break into pieces",
       "sublabel": "small, labeled",
       "tag": "read / not read"
      },
      {
       "id": "make_tools",
       "lane": "tools",
       "col": 2,
       "type": "backend",
       "label": "Make study tools",
       "sublabel": "7 tools at once"
      },
      {
       "id": "sources",
       "lane": "tools",
       "col": 3,
       "type": "security",
       "label": "Point back to source",
       "sublabel": "answers cite pieces"
      },
      {
       "id": "outline",
       "lane": "lessons",
       "col": 2,
       "type": "backend",
       "label": "Structured outline",
       "sublabel": "reorganized material"
      },
      {
       "id": "scripts",
       "lane": "lessons",
       "col": 3,
       "type": "backend",
       "label": "Lesson scripts",
       "sublabel": "spoken-style"
      },
      {
       "id": "save_item",
       "lane": "identity",
       "col": 2,
       "type": "database",
       "label": "Save material",
       "sublabel": "permanent item for kit"
      },
      {
       "id": "name_kit",
       "lane": "identity",
       "col": 3,
       "type": "backend",
       "label": "Name the kit",
       "sublabel": "from the opening",
       "tag": "fallback: file name"
      },
      {
       "id": "gather",
       "lane": "pack",
       "col": 4,
       "type": "backend",
       "label": "Gather study pack",
       "sublabel": "everything in one"
      },
      {
       "id": "save_pack",
       "lane": "pack",
       "col": 5,
       "type": "database",
       "label": "Save to account",
       "sublabel": "available later"
      },
      {
       "id": "missing",
       "lane": "gaps",
       "col": 4,
       "type": "external",
       "label": "Missing-parts list",
       "sublabel": "what and why",
       "tag": "part left empty"
      },
      {
       "id": "show",
       "lane": "you",
       "col": 5,
       "type": "frontend",
       "label": "See finished pack",
       "sublabel": "with a saved note",
       "tag": "audio not yet"
      }
     ],
     "edges": [
      {
       "from": "give",
       "to": "read",
       "label": "material",
       "variant": "emphasis"
      },
      {
       "from": "read",
       "to": "make_tools",
       "label": "pieces",
       "variant": "emphasis"
      },
      {
       "from": "make_tools",
       "to": "sources"
      },
      {
       "from": "read",
       "to": "outline",
       "label": "separate track"
      },
      {
       "from": "outline",
       "to": "scripts"
      },
      {
       "from": "read",
       "to": "save_item",
       "label": "meanwhile",
       "variant": "dashed",
       "role": "async"
      },
      {
       "from": "save_item",
       "to": "name_kit"
      },
      {
       "from": "sources",
       "to": "gather",
       "variant": "emphasis"
      },
      {
       "from": "scripts",
       "to": "gather"
      },
      {
       "from": "name_kit",
       "to": "gather"
      },
      {
       "from": "gather",
       "to": "save_pack",
       "variant": "emphasis"
      },
      {
       "from": "gather",
       "to": "missing",
       "label": "tool failed",
       "variant": "security",
       "role": "error"
      },
      {
       "from": "save_pack",
       "to": "show",
       "label": "saved",
       "variant": "emphasis"
      },
      {
       "from": "save_pack",
       "to": "show",
       "label": "save trouble: pack still shown",
       "variant": "security",
       "role": "error"
      }
     ],
     "cards": [
      {
       "dot": "emerald",
       "title": "One failure keeps the rest",
       "items": [
        "A tool that could not be made is left empty",
        "A short list says what is missing and why",
        "The rest of the pack is still delivered"
       ]
      },
      {
       "dot": "amber",
       "title": "Reading report",
       "items": [
        "You are told how many sources could be read",
        "You are told how many could not"
       ]
      },
      {
       "dot": "slate",
       "title": "Not part of this yet",
       "items": [
        "A spoken-audio version of the pack"
       ]
      }
     ]
    },
    "agentReport": {
     "path": "archify",
     "subject": "S6",
     "rounds": [
      {
       "round": 1,
       "errors": 1,
       "warnings": 0,
       "top_issue": "mainPath step make_tools->gather has no matching edge"
      },
      {
       "round": 2,
       "errors": 0,
       "warnings": 0,
       "top_issue": "none"
      }
     ],
     "first_pass_ok": false,
     "final_ok": true,
     "deliver_ok": true,
     "notes": "One mainPath/edge mismatch fixed in round 2; validate then passed clean at showcase."
    },
    "fileIds": {
     "validate": "025fcf37-d57f-4c28-b01e-20e7ed5a112f",
     "layout": "290295e8-993e-4fce-b104-0aee2814ab1f",
     "visualCheck": "2a76e7ad-b16f-458d-a5cc-959d305279ad"
    },
    "specFileId": "5860cc44-a35d-49a3-9db2-55089d405399"
   }
  ]
 }
];
