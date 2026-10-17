/**
 * What rides an overlay's open data. The old app typed it `unknown`; openers put their options on
 * it, often with null for an absent value and keys of their own (seed nonces, callback group ids).
 * The registry is typed with this wire shape; the definition's Data (the opener's options) types
 * def.useSummon / def.Controller.
 */
export type OverlayWire<T> = { [K in keyof T]?: T[K] | null } & { readonly [key: string]: unknown };

/** The wire for an overlay whose opener sends a payload of its own shape (typed in the opener). */
export type UntypedOverlayWire = object;
