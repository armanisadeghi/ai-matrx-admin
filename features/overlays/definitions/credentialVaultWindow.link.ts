import type { CredentialVaultWindowDefinitionData } from "./credentialVaultWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<CredentialVaultWindowDefinitionData>) {
    dispatch(
      openOverlay({
        overlayId: "credentialVaultWindow",
        instanceId: "default",
        data: {
          selectedItemId: getRestorableResourceId(id, "credentialVaultWindow"),
          location: "",
        },
      }),
    );
}
