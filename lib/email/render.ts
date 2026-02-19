/**
 * React Email render utility.
 *
 * Converts React Email components to HTML strings for use with
 * the Resend client in `lib/email/client.ts`.
 *
 * Usage:
 * ```ts
 * import { renderTemplate } from "@/lib/email/render";
 * import { WelcomeEmail } from "@/lib/email/templates";
 *
 * const html = await renderTemplate(<WelcomeEmail name="Arman" />);
 * await sendEmail({ to, subject: "Welcome!", html });
 * ```
 */

import { render } from "@react-email/render";
import type { ReactElement } from "react";

export async function renderTemplate(element: ReactElement): Promise<string> {
  return render(element);
}

export async function renderTemplateText(element: ReactElement): Promise<string> {
  return render(element, { plainText: true });
}
