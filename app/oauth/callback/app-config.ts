export interface OAuthAppConfig {
    name: string;
    deepLinkScheme: string;
    deepLinkPath: string;
    description?: string;
}

export const OAUTH_APP_REGISTRY: Record<string, OAuthAppConfig> = {
    'matrx-local': {
        name: 'Matrx Local',
        deepLinkScheme: 'aimatrx://',
        deepLinkPath: 'auth/callback',
        description: 'AI Matrx desktop application',
    },
};

export function getAppConfig(slug: string): OAuthAppConfig | null {
    return OAUTH_APP_REGISTRY[slug] ?? null;
}

export function buildDeepLinkUrl(
    config: OAuthAppConfig,
    searchParams: URLSearchParams,
): string {
    const base = `${config.deepLinkScheme}${config.deepLinkPath}`;
    const paramString = searchParams.toString();
    return paramString ? `${base}?${paramString}` : base;
}
