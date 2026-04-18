/**
 * AuthLike — resolver for the credentials attached to outbound AI requests.
 *
 * The package never reads `state.user` directly (doing so would couple it
 * to the host's Redux shape). Instead, it asks the auth adapter at
 * dispatch time for the current access token OR fingerprint id. The
 * consumer's implementation reads whatever store / context / cookie it
 * wants.
 */

export interface Credentials {
  /** Bearer token — populates `Authorization: Bearer <token>`. */
  accessToken?: string | null;
  /** Guest fingerprint — populates `X-Fingerprint-ID` when no token. */
  fingerprintId?: string | null;
}

export interface AuthLike {
  getCredentials(): Credentials | Promise<Credentials>;
}
