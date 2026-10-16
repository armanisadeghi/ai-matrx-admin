/**
 * The message actions now live in @ai-matrx/chat, and they read the chat host (db, diagnostics).
 * Suites that run those actions import this FIRST so the package has a host — the package's own
 * fake db, never a per-test hack. (Suites that render chat UI import register-chat-host instead.)
 */
import { configureChat } from "@ai-matrx/chat/host";
import { createFakeDb } from "@ai-matrx/chat/testing/fake-db";

configureChat({ db: createFakeDb().db });
