// components/official/drill-explorer/describeOnce.ts — ONE DESCRIBE PER CLIENT AND SOURCE
// (lane DRILL-ROUND2): the screen, its siblings and the reconciliation line all describe definitions;
// a definition one client already described (or is describing) is never asked for twice.

import type { DrillSource } from "@ai-matrx/records";
import type { RecordsClient } from "@ai-matrx/records/core";

type Described = ReturnType<RecordsClient["drillDescribe"]>;

const held = new WeakMap<RecordsClient, Map<string, Described>>();

export function describeOnce(client: RecordsClient, source: DrillSource): Described {
  let byKey = held.get(client);
  if (!byKey) held.set(client, (byKey = new Map()));
  const key = JSON.stringify(source);
  const got = byKey.get(key);
  if (got) return got;
  const asked = client.drillDescribe({ source });
  byKey.set(key, asked);
  // a refusal or a throw is not kept: the next ask tries again
  void asked.then(
    (r) => {
      if (!r.ok) byKey?.delete(key);
    },
    () => byKey?.delete(key),
  );
  return asked;
}
