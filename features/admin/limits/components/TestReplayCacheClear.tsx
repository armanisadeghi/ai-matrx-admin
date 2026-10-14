"use client";

// REMOVE-BEFORE-LAUNCH — "Clear test cache" for the temporary admin-only test replay cache
// (knob testing.replay_cache.*; aidream services/runtime/admin_replay_cache.py). Archives every live
// entry of ops.test_replay_cache, so the next identical lookup is real again.

import { useState } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { createClient } from "@/utils/supabase/client";

export const TEST_REPLAY_CACHE_KNOB = "testing.replay_cache.enabled";

export function TestReplayCacheClear() {
  const [state, setState] = useState<{ busy: boolean; result: string | null; error: string | null }>({
    busy: false,
    result: null,
    error: null,
  });

  const clear = async () => {
    setState({ busy: true, result: null, error: null });
    const { data, error } = await createClient()
      .schema("ops")
      .from("test_replay_cache")
      .update({ deleted_at: new Date().toISOString() })
      .is("deleted_at", null)
      .select("id");
    if (error) setState({ busy: false, result: null, error: error.message });
    else setState({ busy: false, result: `${data?.length ?? 0} cleared`, error: null });
  };

  return (
    <div className="mb-2 ml-3 flex items-center gap-2 text-xs">
      <Button variant="outline" onClick={() => void clear()} disabled={state.busy}>
        {state.busy ? "Clearing…" : "Clear test cache"}
      </Button>
      {state.result ? <span className="text-muted-foreground">{state.result}</span> : null}
      {state.error ? <span className="text-destructive">{state.error}</span> : null}
    </div>
  );
}
