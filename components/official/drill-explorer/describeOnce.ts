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

/**
 * IDENTICAL ASKS ARE ONE ASK (lane DRILL-ROUND2): two asks of one client that are the same question at
 * the same moment (the table's and a glance column's, the table's and the chart's) share one call. Only
 * the call in flight is shared; a later ask is a fresh read, so a recount is never answered from here.
 */
export function shareIdenticalAsks(client: RecordsClient): RecordsClient {
  const ask = client.drillAsk.bind(client);
  const flying = new Map<string, ReturnType<RecordsClient["drillAsk"]>>();
  client.drillAsk = ((args: Parameters<RecordsClient["drillAsk"]>[0]) => {
    const key = JSON.stringify(args);
    const held = flying.get(key);
    if (held) return held;
    const sent = ask(args);
    flying.set(key, sent);
    const done = () => flying.delete(key);
    void sent.then(done, done);
    return sent;
  }) as RecordsClient["drillAsk"];
  return client;
}
