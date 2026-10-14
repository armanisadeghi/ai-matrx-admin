/**
 * The direction a linked-in slug pre-fills on the admin kind builder, so the
 * name a viewer saw render badly ("Change for everyone" on an unregistered
 * name links here with `?kind=<slug>`) is kept exactly.
 */
export function initialBuilderNotes(initialKind: string | null | undefined): string {
  return initialKind ? `Register it under the slug exactly "${initialKind}".` : "";
}
