// features/unified-data/base/useBasePort.ts — the records client, as the port the whole-base verbs take (@ai-matrx/records base.ts).

import { useRecordsClient } from "@ai-matrx/records/react";
import type { BasePort } from "@ai-matrx/records";
import { useMemo } from "react";

export function useBasePort(): BasePort {
  const client = useRecordsClient();
  return useMemo<BasePort>(() => ({
    tableDuplicate: (args) => client.tableDuplicate(args),
    finish: (args) => client.baseCopyFinish(args),
    // A copy's automations (OFF) and pages: ONE database function (custom.copy_table_extras), the one the base-move job calls too.
    copyTableExtras: (args) => client.copyTableExtras(args),
    // A NEW base is a new Home, made the way a table's Home is made (declareTable): a record in the person kernel. Copies move in by the one move door.
    createHome: async (name) => {
      const kernel = await client.personKernelId();
      if (!kernel.ok) return kernel;
      return client.recordWrite({ table_id: kernel.data, data: { name } });
    },
    moveInto: (id, home) => client.recordReparent({ record_id: id, parent_id: home }),
    // A table is put away in passes; this loops them until the store says done.
    archive: async (id) => {
      for (let pass = 0; pass < 400; pass += 1) {
        const r = await client.tableArchive({ table_id: id, chunk: 20, includeTable: true });
        if (!r.ok || r.data.done) return r;
      }
      return { ok: false, error: { code: "timed_out", message: "Putting the snapshot away took too many passes; run it again." } } as never;
    },
    unarchive: (id) => client.tableRestoreWhole({ table_id: id }),
  }), [client]);
}
