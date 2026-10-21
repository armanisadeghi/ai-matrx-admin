"use client";

// /memory/lab — Memory Lab is an admin test bench (it reads other people's chats on the
// admin lane, features/memory-lab/FEATURE.md), so it cannot run on a user page. Admins get
// the way in; everyone else is told what it is and sent to their own memories.

import { Brain, TestTubes } from "lucide-react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import AppLink from "@/components/navigation/AppLink";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsSuperAdminPerson } from "@/lib/redux/selectors/userSelectors";
import { MemoryPageFrame } from "./MemoryPageFrame";

export function MemoryLabDoorPage() {
  const isAdmin = useAppSelector(selectIsSuperAdminPerson);
  return (
    <MemoryPageFrame name="Memory Lab">
      <EmptyState
        icon={<TestTubes />}
        title="Memory Lab"
        line={
          isAdmin
            ? "Replay a person's chats through the memory agents in a sandbox."
            : "An admin test bench for the memory agents. Your memories are here."
        }
        action={
          isAdmin ? (
            <Button variant="primary" icon={<TestTubes />} asChild>
              <AppLink href="/administration/intelligence/memory-lab">Open Memory Lab</AppLink>
            </Button>
          ) : (
            <Button variant="primary" icon={<Brain />} asChild>
              <AppLink href="/memory/agent-memory">Your agent memories</AppLink>
            </Button>
          )
        }
      />
    </MemoryPageFrame>
  );
}
