import { useEffect, useState } from "react";

import { kindRegistry } from "@/features/content-ir/registry/kind-registry";

/** The kind's emitted JSON Schema once the registry has read it (undefined until then). */
export function useKindSchema(kind: string | null): unknown {
  const [schema, setSchema] = useState<unknown>(() => (kind ? kindRegistry.getEmittedJsonSchema(kind) : undefined));
  useEffect(() => {
    if (!kind) return;
    const read = () => setSchema(kindRegistry.getEmittedJsonSchema(kind));
    read();
    kindRegistry.requestSchema(kind);
    return kindRegistry.subscribeKind(kind, read);
  }, [kind]);
  return schema;
}
