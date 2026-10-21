// /memory/embeddings — the Embedding Lab's place under Memory › Advanced.
// The lab picks a raw embedding model in the browser, which was ruled dev-only on
// 2026-09-25 (scripts/check-hardcoded-agents.ts, rule embedding-lab-in-product), so it
// runs on the demos site; this page is its door.

import { ExternalLink, Sigma } from "lucide-react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import AppLink from "@/components/navigation/AppLink";
import { MemoryPageFrame } from "./MemoryPageFrame";

export function EmbeddingLabDoorPage() {
  return (
    <MemoryPageFrame name="Embedding Lab">
      <EmptyState
        icon={<Sigma />}
        title="Embedding Lab"
        line="Turn text into vectors and inspect them. Runs on the demos site."
        action={
          <Button variant="primary" iconEnd={<ExternalLink />} asChild>
            <AppLink href="/demos/embedding-lab" target="_blank" rel="noopener noreferrer">
              Open Embedding Lab
            </AppLink>
          </Button>
        }
      />
    </MemoryPageFrame>
  );
}
