// features/launchpad/server/readLaunchpads.ts — THE PERSON'S OWN LAUNCHPADS, READ ON THE SERVER (custom-experience
// lane I). A cold /launchpad/<key> drew skeleton cards until ~4.6 MB of shell JavaScript arrived and only THEN
// asked for the doc (13 s live on 2026-10-19); read here, the saved layout is in the first HTML.
//
// The same read the browser makes (`listAppRows` over the same records data seam, as the signed-in person, under
// their own row security) and the same pick (`visibleLaunchpadRows`). Only the person's OWN launchpads: an `org`
// launchpad depends on the tab's active organization, which only the browser knows, so it is left to the browser.
// Bounded: a slow store never holds the page — past the deadline the browser read draws it, as before.
import "server-only";
import { createRecordsClient } from "@ai-matrx/records/core";
import { listAppRows } from "@ai-matrx/records/typed-table";
import { personActor, recordsDataSource } from "@ai-matrx/records-ui/data-source";
import { createClient } from "@/utils/supabase/server";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { launchpadTable, visibleLaunchpadRows } from "../launchpad.typed-table";

/**
 * How long the server waits for the launchpads before letting the browser read them. loading.tsx has already
 * streamed the skeleton, so the wait is invisible; the browser's own read lands ~12 s into a cold load. A cold
 * function instance spends ~1.5–2 s on its first sign-in check alone, so 2.5 s missed on every cold start live
 * (2026-10-19: "passed 2500 ms" on the first request of each new instance).
 */
const SERVER_READ_DEADLINE_MS = 6000;

/** One of the person's own launchpads, as the server read it (`doc` is the stored JSON text). */
export interface ServerLaunchpad {
  key: string;
  title: string;
  savedAt: string | null;
  doc: string;
}

export interface ServerLaunchpads {
  userId: string;
  pads: ServerLaunchpad[];
}

async function read(): Promise<ServerLaunchpads | null> {
  const supabase = await createClient();
  const { data } = await getClaimsUser(supabase);
  const userId = data.user?.id ?? null;
  if (!userId) return null;
  const client = createRecordsClient({ dataSource: recordsDataSource(supabase), actor: personActor(userId), organizationId: null });
  const listed = await listAppRows(client, launchpadTable);
  if (!listed.ok) {
    console.warn(`[launchpad] server read refused (${listed.error.code}): ${listed.error.message}; the browser reads it`);
    return null;
  }
  const pads = visibleLaunchpadRows(listed.data.rows, userId, null, { organizations: false }).flatMap((r) =>
    typeof r.doc === "string" ? [{ key: r.key, title: r.title || r.key, savedAt: r.saved_at ?? null, doc: r.doc }] : [],
  );
  return { userId, pads };
}

/** The person's own launchpads, or null (signed out, refused, or slower than the deadline — announced). */
export async function readLaunchpadsOnServer(): Promise<ServerLaunchpads | null> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[launchpad] server read passed ${SERVER_READ_DEADLINE_MS} ms; the browser reads it`);
      resolve(null);
    }, SERVER_READ_DEADLINE_MS);
  });
  try {
    return await Promise.race([read(), deadline]);
  } catch (thrown) {
    console.warn(`[launchpad] server read failed after ${Date.now() - started} ms: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
