# Legal · WC Ratings — Frontend Integration Guide

End-to-end guide for integrating the California Workers' Compensation **Permanent Disability (PD) Ratings** API into a frontend. This is the surface that replaced the deprecated `pd_ratings_service` Socket.IO handler.

**Backend router:** [`aidream/api/routers/legal_wc_ratings.py`](../routers/legal_wc_ratings.py)
**Mount prefix:** `/legal/wc/ratings/*` (the legacy `/api/legal/wc/ratings/*` form is also accepted)
**Auth:** every endpoint requires a valid Bearer JWT (`Authorization: Bearer <token>`). No streaming — every endpoint is plain JSON request/response.

---

## TL;DR

```ts
import type { paths, components } from "@/lib/api-types"; // pnpm sync-types regenerates this
import { api } from "@/lib/api-client";

type ClaimCreate   = components["schemas"]["ClaimCreate"];
type WcClaimRead   = components["schemas"]["WcClaimRead"];
type WcReportRead  = components["schemas"]["WcReportRead"];
type WcInjuryRead  = components["schemas"]["WcInjuryRead"];
type InjuryCreate  = components["schemas"]["InjuryCreate"];

// 1. Create a claim
const claim = await api.post<WcClaimRead>("/legal/wc/ratings/claims", {
  applicant_name: "Jane Doe",
  occupational_code: 230,
  weekly_earnings: 290.0,
  age_at_doi: 42,
  date_of_injury: "2024-06-15",
} satisfies ClaimCreate);

// 2. Create the report (one-per-claim)
const report = await api.post<WcReportRead>(
  `/legal/wc/ratings/claims/${claim.id}/report`,
);

// 3. Add one or more injuries
await api.post<WcInjuryRead>(
  `/legal/wc/ratings/reports/${report.id}/injuries`,
  {
    impairment_definition_id: "<uuid from /impairments>",
    wpi: 10,
    pain: 2,
    industrial: 100,
    side: "right",
  } satisfies InjuryCreate,
);

// 4. Crunch the numbers — totals + compensation are written to the report row
const rated = await api.post<WcReportRead>(
  `/legal/wc/ratings/reports/${report.id}/calculate`,
);
console.log(rated.final_rating, rated.compensation_amount);
```

---

## 1 · Pull the types

The backend is the single source of truth for every request/response shape. **Never write API types by hand.**

### One-time setup (in your frontend repo)

```jsonc
// package.json
{
  "scripts": {
    "sync-types": "node ../aidream/scripts/sync-types.mjs --url http://localhost:8000 --out src/lib/generated"
  }
}
```

Adjust the relative path to wherever this aidream repo lives on disk, and `--out` to wherever you want the generated files to land.

### Whenever the backend changes

```bash
# 1. Make sure the backend is running
uv run python run.py        # in the aidream repo

# 2. From your frontend repo:
pnpm sync-types
```

That command:

1. Hits `GET /schema/all` on the backend.
2. Writes `openapi.json`, `stream-events.ts`, `stream-events.schema.json`, `llm-params.schema.json`, `llm-params-enums.generated.ts`.
3. Runs `npx openapi-typescript openapi.json -o api-types.ts` for you.

Now `src/lib/generated/api-types.ts` has every WC-ratings request/response model under `components["schemas"]`.

### What you get for this router

| Generated TypeScript symbol | Use it for |
|---|---|
| `paths["/legal/wc/ratings/claims"]` | Path / method / params / response shape |
| `components["schemas"]["ClaimCreate"]` | `POST /claims` body |
| `components["schemas"]["ClaimPatch"]` | `PATCH /claims/{id}` body |
| `components["schemas"]["WcClaimRead"]` | Claim row response |
| `components["schemas"]["WcReportRead"]` | Report row response |
| `components["schemas"]["WcInjuryRead"]` | Injury row response |
| `components["schemas"]["WcInjuryList"]` | `{ injuries: WcInjuryRead[]; count: number }` |
| `components["schemas"]["InjuryCreate"]` / `InjuryPatch` | Injury bodies |
| `components["schemas"]["WcImpairmentDefinitionRead"]` | One impairment definition |
| `components["schemas"]["ImpairmentsResponse"]` | `GET /impairments` |
| `components["schemas"]["OccupationalCodesResponse"]` | `GET /occupational-codes` |
| `components["schemas"]["ImpairmentSearch"]` / `ImpairmentSearchResponse` | Phrase search |
| `components["schemas"]["StatelessCalculate"]` | `POST /calculate` body |
| `components["schemas"]["StatelessRatingResponse"]` | `POST /calculate` response |

If a name above doesn't exist after `sync-types`, the backend hasn't been restarted with the latest router — restart it and re-sync.

---

## 2 · The data model

```
WcClaim ────(1:1)──── WcReport ────(1:N)──── WcInjury
   │                                            │
   │                                            └─→ WcImpairmentDefinition (read-only)
   │
   └─→ applicant_name, date_of_birth, occupational_code, weekly_earnings, …
```

- A **claim** describes the injured worker + the on-the-job context (applicant, DOI, weekly earnings, occupational code).
- A claim has at most **one report** — it's the container the calculator writes its results onto.
- A report has many **injuries**. Each injury references a canonical **impairment definition** (the AMA-coded medical impairment) by `impairment_definition_id`.
- The user supplies **applicant info on the claim**, **the impairment + percentages on each injury**, and the calculator produces the **final rating + compensation** on the report.

Side conventions: `"left" | "right" | "default"`. Use `"default"` when the impairment isn't side-specific.

---

## 3 · Endpoint reference

All paths are relative to your `AIDREAM_API_URL` base (defaults to `http://localhost:8000`). Every route requires `Authorization: Bearer <token>`.

### Lookups

| Method | Path | Purpose | Response model |
|---|---|---|---|
| GET  | `/legal/wc/ratings/occupational-codes` | All California job codes/industries | `OccupationalCodesResponse` |
| GET  | `/legal/wc/ratings/impairments` | Full impairment-definition catalog | `ImpairmentsResponse` |
| POST | `/legal/wc/ratings/impairments/search` | Phrase-based impairment search | `ImpairmentSearchResponse` |

`ImpairmentSearchResponse.summary` is a **pre-formatted human-readable string** designed for direct display, not parsing. If you need structured data, iterate `ImpairmentsResponse.impairments` and filter client-side.

### Claims

| Method | Path | Purpose | Body | Response |
|---|---|---|---|---|
| POST  | `/legal/wc/ratings/claims` | Create | `ClaimCreate` | `WcClaimRead` (201) |
| GET   | `/legal/wc/ratings/claims/{claim_id}` | Fetch one | — | `WcClaimRead` |
| PATCH | `/legal/wc/ratings/claims/{claim_id}` | Partial update | `ClaimPatch` | `WcClaimRead` |
| GET   | `/legal/wc/ratings/claims/{claim_id}/report` | Fetch the (single) report for a claim | — | `WcReportRead` |

`ClaimCreate` requirements:

- `applicant_name` is required.
- `occupational_code` and `weekly_earnings` are required.
- Provide **either** `age_at_doi` **or** `date_of_birth + date_of_injury` (the backend computes the missing one).
- Dates are `YYYY-MM-DD`.
- `weekly_earnings` is currently capped at `290.0` server-side. Anything higher returns 400. (This is a known dated limit — see the open ticket.)

### Reports

| Method | Path | Purpose | Body | Response |
|---|---|---|---|---|
| POST | `/legal/wc/ratings/claims/{claim_id}/report` | Create the report (one per claim) | — | `WcReportRead` (201, **409** if a report already exists) |
| GET  | `/legal/wc/ratings/reports/{report_id}` | Report row (totals empty until `/calculate`) | — | `WcReportRead` |
| GET  | `/legal/wc/ratings/reports/{report_id}/injuries` | List every injury on the report | — | `WcInjuryList` |
| POST | `/legal/wc/ratings/reports/{report_id}/calculate` | Run the calc and persist results | — | `WcReportRead` (with totals filled in) |

`WcReportRead` fields populated by `/calculate`:

- `final_rating` — the combined PD percentage (0–100)
- `left_side_total`, `right_side_total`, `default_side_total` — per-side combined values
- `compensation_amount` — total dollar amount
- `compensation_weeks`, `compensation_days` — duration

After `/calculate`, the **injuries themselves** are also updated with `rating` and `formula` columns — fetch them via `GET /reports/{report_id}/injuries` to display the per-injury breakdown.

### Injuries

| Method | Path | Purpose | Body | Response |
|---|---|---|---|---|
| POST   | `/legal/wc/ratings/reports/{report_id}/injuries` | Add | `InjuryCreate` | `WcInjuryRead` (201) |
| PATCH  | `/legal/wc/ratings/injuries/{injury_id}` | Partial update | `InjuryPatch` | `WcInjuryRead` |
| DELETE | `/legal/wc/ratings/injuries/{injury_id}` | Remove | — | `204 No Content` |

`InjuryCreate` notes:

- `impairment_definition_id` is the **UUID** from the impairment catalog (`GET /impairments`), **not** the AMA `impairment_number` string.
- Provide whichever percentage fields the impairment requires:
  - `wpi` — Whole Person Impairment (used for most spinal/internal impairments)
  - `ue` — Upper Extremity (for shoulder/arm/wrist)
  - `le` — Lower Extremity (for hip/knee/ankle/foot)
  - `digit` — Finger/thumb/toe percentage (must be paired with `side` = "left" | "right")
- `pain`: 0–3 (added to WPI before adjustment)
- `industrial`: 0–100 (apportionment % attributable to work; defaults to 100)
- `side`: `"left" | "right" | "default"`. Defaults to `"default"`.

If the underlying impairment definition doesn't accept a given attribute, the backend will silently drop it and report it back via the `warnings: string[]` field on the response. **Read `warnings`** — they're how the rating engine tells you something was applied differently than you sent.

### Stateless calculator

| Method | Path | Purpose | Body | Response |
|---|---|---|---|---|
| POST | `/legal/wc/ratings/calculate` | Compute a full rating without writing to the DB | `StatelessCalculate` | `StatelessRatingResponse` |

Use this for "what-if" UIs, scratchpad calculators, or any flow where you don't want a DB row created. The response includes the full `combined_rating` (per-side breakdown) + `compensation` block.

```ts
import type { components } from "@/lib/generated/api-types";
type StatelessCalculate = components["schemas"]["StatelessCalculate"];
type StatelessRatingResponse = components["schemas"]["StatelessRatingResponse"];

const result = await api.post<StatelessRatingResponse>(
  "/legal/wc/ratings/calculate",
  {
    applicant: {
      name: "Jane Doe",
      employee_id: "",
      date_of_birth: "1982-04-12",
    },
    claim: {
      occupational_code: 230,
      weekly_earnings: 290.0,
      date_of_injury: "2024-06-15",
    },
    injuries: [
      {
        impairment_definition_id: "<uuid>",
        attributes: { wpi: 10, side: "right" },
        pain: 2,
        industrial: 100,
      },
    ],
  } satisfies StatelessCalculate,
);

result.result?.combined_rating.final_rating;   // → number | null
result.result?.compensation.compensation;      // → dollar amount
```

---

## 4 · Errors

Every error response is a JSON body with this exact shape:

```ts
{ detail: { code: string; message: string } }
```

Common cases:

| Status | `detail.code` | When |
|---|---|---|
| 400 | `claim_validation_failed` | `ClaimCreate` / `ClaimPatch` failed validation (e.g. weekly earnings > 290, missing required field) |
| 400 | `injury_validation_failed` | `InjuryCreate` / `InjuryPatch` validation failed |
| 400 | `rating_calculation_failed` | Calculator raised — usually means the injury attributes are inconsistent with the impairment definition |
| 400 | `invalid_applicant` / `invalid_injury` / `invalid_dates` / `invalid_side` | Stateless calculator inputs failed validation |
| 401 | — | Missing or invalid JWT |
| 404 | `claim_not_found` / `report_not_found` / `injury_not_found` / `impairment_definition_not_found` | ID doesn't exist |
| 409 | `report_already_exists` | A claim can only have one report |

The dashboard's `ApiError` (in `src/lib/api-client.ts`) already carries `status` + `body` — display `body.detail.message` to the user and key behavior off `body.detail.code` rather than parsing the message.

```ts
import { ApiError } from "@/lib/api-client";

try {
  await api.post(...);
} catch (e) {
  if (e instanceof ApiError && e.status === 409) {
    const code = (e.body as any)?.detail?.code;
    if (code === "report_already_exists") {
      // recover by fetching the existing report
      const existing = await api.get<WcReportRead>(
        `/legal/wc/ratings/claims/${claimId}/report`,
      );
      // …
    }
  }
}
```

---

## 5 · End-to-end example (TanStack Query)

A complete, ready-to-paste hook set for the dashboard. Drop into `src/features/wc-ratings/hooks.ts`.

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@/lib/generated/api-types";
import { api } from "@/lib/api-client";

type ClaimCreate    = components["schemas"]["ClaimCreate"];
type ClaimPatch     = components["schemas"]["ClaimPatch"];
type WcClaimRead    = components["schemas"]["WcClaimRead"];
type WcReportRead   = components["schemas"]["WcReportRead"];
type WcInjuryRead   = components["schemas"]["WcInjuryRead"];
type WcInjuryList   = components["schemas"]["WcInjuryList"];
type InjuryCreate   = components["schemas"]["InjuryCreate"];
type InjuryPatch    = components["schemas"]["InjuryPatch"];
type ImpairmentsResponse        = components["schemas"]["ImpairmentsResponse"];
type OccupationalCodesResponse  = components["schemas"]["OccupationalCodesResponse"];

const BASE = "/legal/wc/ratings";

// ----- Lookups (rarely change → long staleTime) -------------------------

export function useOccupationalCodes() {
  return useQuery({
    queryKey: ["wc-ratings", "occupational-codes"],
    queryFn: () => api.get<OccupationalCodesResponse>(`${BASE}/occupational-codes`),
    staleTime: 1000 * 60 * 60, // 1h
  });
}

export function useImpairments() {
  return useQuery({
    queryKey: ["wc-ratings", "impairments"],
    queryFn: () => api.get<ImpairmentsResponse>(`${BASE}/impairments`),
    staleTime: 1000 * 60 * 60,
  });
}

// ----- Claim -----------------------------------------------------------

export function useClaim(claimId: string | undefined) {
  return useQuery({
    queryKey: ["wc-ratings", "claim", claimId],
    queryFn: () => api.get<WcClaimRead>(`${BASE}/claims/${claimId}`),
    enabled: !!claimId,
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClaimCreate) => api.post<WcClaimRead>(`${BASE}/claims`, body),
    onSuccess: (claim) => {
      qc.setQueryData(["wc-ratings", "claim", claim.id], claim);
    },
  });
}

export function useUpdateClaim(claimId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClaimPatch) =>
      api.patch<WcClaimRead>(`${BASE}/claims/${claimId}`, body),
    onSuccess: (claim) => {
      qc.setQueryData(["wc-ratings", "claim", claim.id], claim);
    },
  });
}

// ----- Report ----------------------------------------------------------

export function useReportForClaim(claimId: string | undefined) {
  return useQuery({
    queryKey: ["wc-ratings", "claim-report", claimId],
    queryFn: () => api.get<WcReportRead>(`${BASE}/claims/${claimId}/report`),
    enabled: !!claimId,
    retry: (count, err) => {
      // 404 means "no report yet" — don't keep retrying
      if (err instanceof Error && (err as any).status === 404) return false;
      return count < 1;
    },
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) =>
      api.post<WcReportRead>(`${BASE}/claims/${claimId}/report`),
    onSuccess: (report, claimId) => {
      qc.setQueryData(["wc-ratings", "claim-report", claimId], report);
      qc.setQueryData(["wc-ratings", "report", report.id], report);
    },
  });
}

export function useReportInjuries(reportId: string | undefined) {
  return useQuery({
    queryKey: ["wc-ratings", "report-injuries", reportId],
    queryFn: () => api.get<WcInjuryList>(`${BASE}/reports/${reportId}/injuries`),
    enabled: !!reportId,
  });
}

export function useCalculateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) =>
      api.post<WcReportRead>(`${BASE}/reports/${reportId}/calculate`),
    onSuccess: (report) => {
      qc.setQueryData(["wc-ratings", "report", report.id], report);
      // Per-injury rating + formula columns were just updated server-side.
      qc.invalidateQueries({ queryKey: ["wc-ratings", "report-injuries", report.id] });
    },
  });
}

// ----- Injuries --------------------------------------------------------

export function useAddInjury(reportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InjuryCreate) =>
      api.post<WcInjuryRead>(`${BASE}/reports/${reportId}/injuries`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wc-ratings", "report-injuries", reportId] });
    },
  });
}

export function useUpdateInjury(reportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ injuryId, body }: { injuryId: string; body: InjuryPatch }) =>
      api.patch<WcInjuryRead>(`${BASE}/injuries/${injuryId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wc-ratings", "report-injuries", reportId] });
    },
  });
}

export function useDeleteInjury(reportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (injuryId: string) =>
      api.delete<void>(`${BASE}/injuries/${injuryId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wc-ratings", "report-injuries", reportId] });
    },
  });
}
```

### Sample component flow

```tsx
function PdRatingWizard({ claimId }: { claimId: string }) {
  const claim = useClaim(claimId);
  const report = useReportForClaim(claimId);
  const injuries = useReportInjuries(report.data?.id);

  const createReport = useCreateReport();
  const calculate    = useCalculateReport();

  if (!claim.data) return null;

  // First time? Create the report shell.
  if (!report.data) {
    return (
      <button onClick={() => createReport.mutate(claimId)}>
        Start rating report
      </button>
    );
  }

  return (
    <div>
      <h2>{claim.data.applicant_name}</h2>
      <InjuryEditor reportId={report.data.id} injuries={injuries.data?.injuries ?? []} />
      <button onClick={() => calculate.mutate(report.data.id)}>
        Recalculate
      </button>
      {report.data.final_rating != null && (
        <div>
          Final rating: <strong>{report.data.final_rating}%</strong> · ${report.data.compensation_amount?.toFixed(2)}
          {" "}({report.data.compensation_weeks}w {report.data.compensation_days}d)
        </div>
      )}
    </div>
  );
}
```

---

## 6 · Common pitfalls

1. **Don't try to re-create a report.** Each claim has at most one — the second `POST /claims/{id}/report` returns **409**. Use `GET /claims/{id}/report` (or `useReportForClaim` above) to fetch the existing one.
2. **`impairment_definition_id` is a UUID, not the AMA code.** The catalog at `GET /impairments` is keyed by UUID. The AMA-style "15.03.02.05" string is `impairment_number` inside the row.
3. **Send only the percentage fields the impairment expects.** Each impairment definition has an `attributes` object (`{wpi, le, ue, side, digit}` of booleans) telling you which fields are required/allowed. Sending an extra field results in a warning, not an error — but it's noise.
4. **Calculate runs against currently-saved injuries.** It does not accept inline data. Pattern: add/edit injuries → POST `/calculate`. For a what-if UI, use the stateless `/calculate` endpoint instead.
5. **Always read `warnings` on injury responses.** Real validation issues produce 400s; non-fatal "we changed your input because it didn't quite match the impairment" notes show up in `warnings: string[]` on the success response.
6. **`weekly_earnings` is capped at 290.0 server-side.** Anything higher → 400. This reflects a 2010-era CA WC limit baked into the legacy validator. Until that's lifted, clamp client-side.
7. **The two GET-by-FK helpers are non-cached.** `GET /claims/{id}` uses `use_cache=False`, and `GET /claims/{id}/report` re-queries every call. Wrap them with React Query (`staleTime`) on your side rather than calling them in tight loops.
8. **Re-run `pnpm sync-types` whenever the backend ships.** If `components["schemas"]["WcInjuryRead"]` resolves to `unknown`, your generated file is stale.

---

## 7 · OpenAPI playground

The backend serves the live OpenAPI spec at:

- **Swagger UI:** `http://localhost:8000/docs#/Legal%20%C2%B7%20WC%20Ratings`
- **ReDoc:** `http://localhost:8000/redoc`
- **Raw JSON:** `http://localhost:8000/schema/openapi`

Both UIs let you fire requests with your bearer token directly — quickest way to sanity-check a payload before wiring it into the FE.

---

## 8 · What's *not* in this surface (yet)

- **No "list claims" endpoint.** The `wc_claim` table currently has no `user_id` column, so per-user filtering isn't possible without a schema change. If you need this, file a backend ticket — don't paper over it with `GET /admin/db/wc_claim` (it's admin-only and shows everyone's claims).
- **No bulk injury creation.** Each `POST /reports/{id}/injuries` is one injury at a time.
- **No streaming.** The whole pipeline is synchronous — every endpoint returns a response in one HTTP roundtrip. If a future endpoint needs to stream (e.g. an AI-driven impairment suggestion flow), it'll mount under a separate route, not here.
