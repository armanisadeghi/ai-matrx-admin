# lib/workflows

| File | What |
|---|---|
| `system-runs.ts` | The shared door to aidream's system-workflow lane (`startSystemRun`, `lookupSystemRun`, `isServerUpdatingRefusal`): `POST /workflows/system/{key}/runs` and `GET …/runs?subject=`. Used by education kits, Smart Add and the Agent Studio build. A workflow may accept several subject kinds (`<kind>:<uuid>`); aidream refuses any other. Moved from `features/education/kits/systemRuns.ts`. Tests in `__tests__/`. |
