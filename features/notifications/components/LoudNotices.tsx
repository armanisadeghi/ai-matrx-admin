"use client";

/**
 * The loud notice host: reads the signed-in person's loud notices (`communication.my_loud_notices`)
 * when the shell loads and when the window regains focus, and renders `LoudNoticesPanel`. Handled
 * notices leave at once (optimistic); "Remind me later" hides the current set for this browser
 * session, and a refreshed notice (a bump) asks again. Mounted once, by the announcement provider,
 * after shell data has loaded.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";
import { setNoticesState } from "../service";
import { fetchLoudNotices, laterKey, readLater, writeLater, type LoudNotice } from "../loud/loudNotices";
import { verbsFor } from "../loud/targetVerbs";
import LoudNoticesPanel from "./LoudNoticesPanel";

export default function LoudNotices() {
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const [notices, setNotices] = useState<LoudNotice[]>([]);
  const [later, setLater] = useState<string[]>([]);
  const [handled, setHandled] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    setLater(readLater(userId));
    let alive = true;
    const load = () =>
      fetchLoudNotices()
        .then((rows) => alive && setNotices(rows))
        .catch((e: unknown) => console.error("[loud-notices] could not read loud notices", e));
    void load();
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.removeEventListener("focus", load);
    };
  }, [userId]);

  const shown = notices.filter((n) => !handled.includes(n.id) && !later.includes(laterKey(n)));

  const putOff = () => {
    const keys = [...new Set([...later, ...shown.map(laterKey)])];
    setLater(keys);
    if (userId) writeLater(userId, keys);
  };

  const act = async (n: LoudNotice, run: () => Promise<unknown>, done: string) => {
    setHandled((h) => [...h, n.id]);
    try {
      await run();
      toast.success(done);
    } catch (e) {
      setHandled((h) => h.filter((id) => id !== n.id));
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <LoudNoticesPanel
      notices={shown}
      onOpen={(n) => {
        putOff();
        if (n.deep_link) router.push(n.deep_link);
      }}
      onDone={(n) => void act(n, () => setNoticesState([n.id], "done"), "Marked done")}
      onResolve={(n, note) => {
        const resolve = verbsFor(n).resolve;
        if (resolve) void act(n, () => resolve.run(n, note), "Resolved for everyone");
      }}
      onSnooze={(n) => {
        const snooze = verbsFor(n).snooze;
        if (snooze) void act(n, () => snooze.run(n), "Snoozed for 24 hours");
      }}
      onLater={putOff}
    />
  );
}
