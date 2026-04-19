/**
 * React hooks barrel — consumer-facing CRUD + persistence helpers.
 *
 * All hooks read from and dispatch to the slices already owned by the
 * package; consumers just import and use.
 */

export {
  useMessageBlockPersistence,
  type UseMessageBlockPersistenceArgs,
  type UseMessageBlockPersistenceReturn,
  type PersistedBlock,
} from "@/features/agents/hooks/message-crud/useMessageBlockPersistence";

export {
  useMessageActions,
  type UseMessageActionsArgs,
  type UseMessageActionsReturn,
} from "@/features/agents/hooks/message-crud/useMessageActions";
