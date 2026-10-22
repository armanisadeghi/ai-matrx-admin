/**
 * A test that renders a REAL access screen (`@ai-matrx/sharing/access/react`) calls this once: the
 * screens refuse to guess a sign-in link, a person or a toast, so they throw until the host
 * configures them. This gives them the web's own inputs (`features/access-gate/accessUiEnv`).
 */
import { ensureAccessUiEnv } from "@/features/access-gate/accessUiEnv";

export function configureAccessUiForTests(): void {
  ensureAccessUiEnv();
}
