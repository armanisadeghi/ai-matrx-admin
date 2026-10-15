"use client";

/**
 * Slim shell for THE "can't remove it" screen host — mount once per provider
 * tree, beside `<ConfirmDialogHost />`. The body loads lazily.
 */

import dynamic from "next/dynamic";

const CantRemoveDialogHostImpl = dynamic(() => import("./CantRemoveDialogHostImpl"), {
  ssr: false,
  loading: () => null,
});

export function CantRemoveDialogHost() {
  return <CantRemoveDialogHostImpl />;
}
