/**
 * Surface manifest — one e-signature template (`matrx-user/esign-template`), route
 * `/esign/templates/[templateId]` (`new` opens a blank one).
 *
 * The same editor as an envelope draft (`EsignEditor` in template mode), so it shows and accepts the
 * same composition values and targets (`ESIGN_COMPOSITION_VALUES` / `ESIGN_WRITE_TARGETS` from
 * `esign-envelope.manifest.ts`), plus which template it is. A template is never sent; it is saved by
 * the person's "Save as template" press, which stays theirs.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import { ESIGN_COMPOSITION_VALUES, ESIGN_GROUPS, ESIGN_WRITE_TARGETS } from "./esign-envelope.manifest";

export const ESIGN_TEMPLATE_SURFACE_NAME = "matrx-user/esign-template";

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "template_id",
    label: "Template ID",
    description: "UUID of the template; null for a new template not saved yet.",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 36,
    group: "esign_envelope",
    sortOrder: 105,
  },
  {
    name: "template_name",
    label: "Template name",
    description: "The template's saved name (empty for a new one).",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 40,
    group: "esign_envelope",
    sortOrder: 106,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: ESIGN_TEMPLATE_SURFACE_NAME,
  situation:
    "They are editing the e-signature template {template_name|a new template}. You can fill in its title, subject and message and its recipient roles; the person saves it.",
  inheritsFrom: "matrx-default/content",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "E-signature template",
  description: "One reusable e-signature template: documents, recipient roles, message and fields.",
  urlPattern: "/esign/templates/[templateId]",
  groups: ESIGN_GROUPS,
  values: mergeBaselineValues(pickBaseline("selection"), [...ESIGN_COMPOSITION_VALUES, ...surfaceSpecific]),
  writeTargets: ESIGN_WRITE_TARGETS,
};

export const esignTemplateManifest = declared;

export function createEsignTemplateScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
