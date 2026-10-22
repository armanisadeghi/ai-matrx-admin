"use client";

/**
 * The `scopeMismatchDialog` overlay: design-system's ScopeMismatchDialog with the app's scope door.
 * THE DOOR LAW: the dialog asks the person to CHOOSE between two scope sets, so every scope is an EntityRef (the
 * route and the peek) — linked even when the tree could not resolve the name, because `/scopes/s/<id>` resolves a
 * scope from its id alone.
 */
import { ScopeMismatchDialog } from "@ai-matrx/design-system";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { useOverlayRequest, type OverlayRenderProps } from "@ai-matrx/summon/react";
import type { ScopeMismatchChoice } from "@/features/scopes/utils/scopeMismatch";
import type { ScopeMismatchRequest } from "@/components/dialogs/scope-mismatch/scopeMismatchOpener";

export default function OverlayRender({ data, close }: OverlayRenderProps) {
  const { request, settle } = useOverlayRequest<ScopeMismatchRequest, ScopeMismatchChoice>(data, close);
  return (
    <ScopeMismatchDialog
      open={request !== null}
      current={request?.current ?? []}
      chat={request?.chat ?? []}
      onChoose={settle}
      renderScope={(item) => <EntityRef token="scope" id={item.id} name={item.name} showIcon={false} />}
    />
  );
}
