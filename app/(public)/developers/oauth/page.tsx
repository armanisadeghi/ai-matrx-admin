import { Metadata } from 'next';
import {
    ShieldCheck,
    Key,
    Code2,
    RefreshCw,
    Globe,
    Lock,
    Zap,
    BookOpen,
    ArrowRight,
    Bot,
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'OAuth 2.1 Developer Guide | AI Matrx',
    description:
        'Integrate with AI Matrx using OAuth 2.1 and OpenID Connect. Build "Sign in with AI Matrx" or authenticate AI agents via MCP.',
    openGraph: {
        title: 'OAuth 2.1 Developer Guide | AI Matrx',
        description:
            'Integrate with AI Matrx using OAuth 2.1 and OpenID Connect.',
    },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL = 'https://txzxabzwovsujtloxrus.supabase.co';

const ENDPOINTS = [
    {
        label: 'Authorization',
        url: `${SUPABASE_URL}/auth/v1/oauth/authorize`,
    },
    {
        label: 'Token',
        url: `${SUPABASE_URL}/auth/v1/oauth/token`,
    },
    {
        label: 'UserInfo',
        url: `${SUPABASE_URL}/auth/v1/oauth/userinfo`,
    },
    {
        label: 'JWKS',
        url: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    },
    {
        label: 'OIDC Discovery',
        url: `${SUPABASE_URL}/auth/v1/.well-known/openid-configuration`,
    },
    {
        label: 'OAuth Discovery',
        url: `${SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`,
    },
    {
        label: 'Dynamic Registration',
        url: `${SUPABASE_URL}/auth/v1/oauth/clients/register`,
    },
];

const SCOPES = [
    {
        name: 'openid',
        description: 'Enables OpenID Connect. An ID token will be included in the token response.',
        required: false,
    },
    {
        name: 'email',
        description: 'Access to the user\'s email address and verification status.',
        required: false,
    },
    {
        name: 'profile',
        description: 'Access to the user\'s name and profile picture.',
        required: false,
    },
    {
        name: 'phone',
        description: 'Access to the user\'s phone number and verification status.',
        required: false,
    },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OAuthDeveloperDocs() {
    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
                {/* Hero */}
                <header className="mb-12">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
                        <BookOpen className="h-4 w-4" />
                        Developer Documentation
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
                        OAuth 2.1 Integration Guide
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl">
                        AI Matrx acts as an OAuth 2.1 and OpenID Connect identity provider. You can
                        build &quot;Sign in with AI Matrx&quot; experiences, authenticate AI agents via MCP,
                        or integrate with your platform using standards-compliant OAuth.
                    </p>
                </header>

                {/* Quick Overview Cards */}
                <section className="grid sm:grid-cols-3 gap-4 mb-14">
                    <FeatureCard
                        icon={ShieldCheck}
                        title="OAuth 2.1 + PKCE"
                        description="Authorization code flow with mandatory PKCE for all client types."
                    />
                    <FeatureCard
                        icon={Bot}
                        title="MCP Compatible"
                        description="Dynamic client registration for AI agents and MCP servers."
                    />
                    <FeatureCard
                        icon={Lock}
                        title="OpenID Connect"
                        description="ID tokens, UserInfo endpoint, and full OIDC discovery."
                    />
                </section>

                {/* Two integration modes */}
                <section className="mb-14">
                    <SectionHeading id="integration-modes">Two Integration Modes</SectionHeading>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        AI Matrx supports both pre-registered and dynamically registered OAuth clients.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-5">
                        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Pre-Registered Apps
                                </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                For web apps, mobile apps, and services where you know the client in advance.
                                You receive a <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">client_id</code> and{' '}
                                <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">client_secret</code> during registration.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                Contact the AI Matrx team to register your application.
                            </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Dynamic Registration
                                </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                For MCP clients, AI agents, and tools that register themselves automatically.
                                Uses the <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">registration_endpoint</code>{' '}
                                from the discovery document.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                No manual setup required. Clients self-register via the API.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Endpoints */}
                <section className="mb-14">
                    <SectionHeading id="endpoints">Endpoints</SectionHeading>
                    <div className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                        Endpoint
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                        URL
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-700 bg-white dark:bg-neutral-800/50">
                                {ENDPOINTS.map((ep) => (
                                    <tr key={ep.label}>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                            {ep.label}
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                                                {ep.url}
                                            </code>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Scopes */}
                <section className="mb-14">
                    <SectionHeading id="scopes">Available Scopes</SectionHeading>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Include scopes as a space-separated string in the <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">scope</code> parameter
                        of your authorization request. Default scope when none is provided: <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">email</code>.
                    </p>
                    <div className="space-y-2">
                        {SCOPES.map((scope) => (
                            <div
                                key={scope.name}
                                className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3"
                            >
                                <code className="shrink-0 mt-0.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-xs font-mono font-semibold text-blue-700 dark:text-blue-300">
                                    {scope.name}
                                </code>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {scope.description}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Authorization Code Flow */}
                <section className="mb-14">
                    <SectionHeading id="auth-flow">Authorization Code Flow (PKCE)</SectionHeading>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        AI Matrx uses the OAuth 2.1 authorization code flow with mandatory PKCE.
                        Here is the complete step-by-step process.
                    </p>

                    <div className="space-y-6">
                        {/* Step 1 */}
                        <FlowStep number={1} title="Generate PKCE Parameters">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Before initiating the flow, generate a random <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">code_verifier</code>{' '}
                                and derive a <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">code_challenge</code> using SHA-256.
                            </p>
                            <CodeBlock
                                language="javascript"
                                code={`// Generate a random code verifier (43-128 characters)
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Create code challenge from verifier (SHA-256)
async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=/g, '');
}

const codeVerifier = generateCodeVerifier();
sessionStorage.setItem('code_verifier', codeVerifier);
const codeChallenge = await generateCodeChallenge(codeVerifier);`}
                            />
                        </FlowStep>

                        {/* Step 2 */}
                        <FlowStep number={2} title="Redirect to Authorization Endpoint">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Redirect the user to the AI Matrx authorization endpoint with the required parameters.
                            </p>
                            <CodeBlock
                                language="text"
                                code={`${SUPABASE_URL}/auth/v1/oauth/authorize?
  response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://your-app.com/callback
  &state=RANDOM_STATE_STRING
  &code_challenge=CODE_CHALLENGE
  &code_challenge_method=S256
  &scope=openid email profile`}
                            />
                            <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-700/40 px-3.5 py-2.5">
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    <strong>Required parameters:</strong> response_type, client_id, redirect_uri, code_challenge, code_challenge_method.
                                    Always include <code className="font-mono">state</code> for CSRF protection.
                                </p>
                            </div>
                        </FlowStep>

                        {/* Step 3 */}
                        <FlowStep number={3} title="User Authenticates and Consents">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                AI Matrx shows a login screen (if needed) and then a consent screen where the
                                user approves or denies access. The user sees your app name, requested scopes,
                                and the redirect domain.
                            </p>
                        </FlowStep>

                        {/* Step 4 */}
                        <FlowStep number={4} title="Handle the Callback">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                After consent, the user is redirected back to your <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">redirect_uri</code> with
                                an authorization code and state.
                            </p>
                            <CodeBlock
                                language="text"
                                code={`https://your-app.com/callback?code=AUTH_CODE&state=RANDOM_STATE_STRING`}
                            />
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                                If the user denies access:
                            </p>
                            <CodeBlock
                                language="text"
                                code={`https://your-app.com/callback?error=access_denied&error_description=The+user+denied+the+authorization+request&state=RANDOM_STATE_STRING`}
                            />
                        </FlowStep>

                        {/* Step 5 */}
                        <FlowStep number={5} title="Exchange Code for Tokens">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Exchange the authorization code for access, refresh, and (optionally) ID tokens.
                            </p>
                            <CodeBlock
                                language="javascript"
                                code={`const response = await fetch('${SUPABASE_URL}/auth/v1/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET', // omit for public clients
    redirect_uri: 'https://your-app.com/callback',
    code_verifier: sessionStorage.getItem('code_verifier'),
  }),
});

const tokens = await response.json();
// tokens: { access_token, token_type, expires_in, refresh_token, scope, id_token? }`}
                            />
                        </FlowStep>

                        {/* Step 6 */}
                        <FlowStep number={6} title="Use the Access Token">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Use the access token to call the AI Matrx API on behalf of the user.
                            </p>
                            <CodeBlock
                                language="javascript"
                                code={`// Fetch user info
const userInfo = await fetch('${SUPABASE_URL}/auth/v1/oauth/userinfo', {
  headers: { Authorization: 'Bearer ' + tokens.access_token },
}).then(r => r.json());

// Use with Supabase client
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('${SUPABASE_URL}', 'YOUR_ANON_KEY', {
  global: { headers: { Authorization: 'Bearer ' + tokens.access_token } },
});`}
                            />
                        </FlowStep>
                    </div>
                </section>

                {/* Refresh Tokens */}
                <section className="mb-14">
                    <SectionHeading id="refresh-tokens">Refreshing Tokens</SectionHeading>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Access tokens expire after 1 hour. Use the refresh token to obtain a new access token
                        without re-prompting the user.
                    </p>
                    <CodeBlock
                        language="javascript"
                        code={`const refreshResponse = await fetch('${SUPABASE_URL}/auth/v1/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET', // omit for public clients
  }),
});

const newTokens = await refreshResponse.json();
// Always update your stored refresh_token - it may be rotated.`}
                    />
                </section>

                {/* Token Validation */}
                <section className="mb-14">
                    <SectionHeading id="token-validation">Token Validation</SectionHeading>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Validate access tokens using the JWKS endpoint. AI Matrx uses ES256 (ECDSA P-256) for JWT signing.
                    </p>
                    <CodeBlock
                        language="javascript"
                        code={`import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('${SUPABASE_URL}/auth/v1/.well-known/jwks.json')
);

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: '${SUPABASE_URL}/auth/v1',
    audience: 'authenticated',
  });
  return payload; // includes sub, email, client_id, etc.
}`}
                    />
                </section>

                {/* Dynamic Registration for MCP */}
                <section className="mb-14">
                    <SectionHeading id="mcp">MCP and Dynamic Registration</SectionHeading>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        AI agents and MCP-compatible tools can register themselves automatically using
                        the dynamic client registration endpoint. No manual setup required.
                    </p>
                    <div className="space-y-4">
                        <div className="rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 p-4">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                                How it works
                            </h4>
                            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                                <li>MCP client fetches the OIDC discovery document</li>
                                <li>Client auto-registers via the <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-xs font-mono">registration_endpoint</code></li>
                                <li>User is prompted to authenticate and consent</li>
                                <li>Client receives tokens and can access data on behalf of the user</li>
                            </ol>
                        </div>
                        <CodeBlock
                            language="javascript"
                            code={`// Dynamic client registration
const regResponse = await fetch('${SUPABASE_URL}/auth/v1/oauth/clients/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_name: 'My MCP Tool',
    redirect_uris: ['https://my-tool.example.com/callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none', // public client
  }),
});

const client = await regResponse.json();
// client: { client_id, client_secret?, ... }`}
                        />
                    </div>
                </section>

                {/* Important Notes */}
                <section className="mb-14">
                    <SectionHeading id="important-notes">Important Notes</SectionHeading>
                    <div className="space-y-3">
                        <NoteCard
                            icon={Globe}
                            title="Redirect URIs must be exact"
                            description="OAuth redirect URIs require exact matches. No wildcards or patterns. Register the full URL including protocol, domain, path, and port."
                        />
                        <NoteCard
                            icon={Lock}
                            title="PKCE is mandatory"
                            description="All clients (confidential and public) must use PKCE with S256 code challenge method. Plain code challenges are supported but S256 is recommended."
                        />
                        <NoteCard
                            icon={RefreshCw}
                            title="Refresh tokens may rotate"
                            description="Always update your stored refresh token when you receive a new one in a token response. The old refresh token may be invalidated."
                        />
                        <NoteCard
                            icon={Code2}
                            title="Authorization codes expire in 10 minutes"
                            description="Exchange the authorization code for tokens promptly. Codes are single-use and expire after 10 minutes."
                        />
                    </div>
                </section>

                {/* Access Token Claims */}
                <section className="mb-14">
                    <SectionHeading id="token-claims">Access Token Claims</SectionHeading>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Access tokens are standard JWTs with the following claims:
                    </p>
                    <div className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                        Claim
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                        Description
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-700 bg-white dark:bg-neutral-800/50">
                                {[
                                    ['sub', 'User ID (UUID)'],
                                    ['email', "User's email address"],
                                    ['role', 'Always "authenticated" for OAuth tokens'],
                                    ['client_id', 'The OAuth client that obtained this token'],
                                    ['aud', '"authenticated"'],
                                    ['iss', 'Issuer URL (Supabase Auth)'],
                                    ['exp', 'Expiration timestamp'],
                                    ['iat', 'Issued-at timestamp'],
                                    ['session_id', 'Session identifier'],
                                ].map(([claim, desc]) => (
                                    <tr key={claim}>
                                        <td className="px-4 py-2.5">
                                            <code className="text-xs font-mono font-semibold text-gray-900 dark:text-white">
                                                {claim}
                                            </code>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                                            {desc}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Help */}
                <section className="mb-8">
                    <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 p-6 text-center">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Need Help?
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            To register a pre-configured OAuth app or get integration support, reach out to the AI Matrx team.
                        </p>
                        <a
                            href="/contact"
                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
                        >
                            Contact Us
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h2
            id={id}
            className="text-xl font-bold text-gray-900 dark:text-white mb-4 scroll-mt-20"
        >
            {children}
        </h2>
    );
}

function FeatureCard({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof ShieldCheck;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 mb-3">
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
        </div>
    );
}

function FlowStep({
    number,
    title,
    children,
}: {
    number: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="relative pl-10">
            <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold">
                {number}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{title}</h3>
            {children}
        </div>
    );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
    return (
        <div className="rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
            <div className="flex items-center justify-between bg-gray-100 dark:bg-neutral-800 px-3 py-1.5 border-b border-gray-200 dark:border-neutral-700">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {language}
                </span>
            </div>
            <pre className="overflow-x-auto p-3 bg-gray-50 dark:bg-neutral-900 text-xs leading-relaxed">
                <code className="font-mono text-gray-800 dark:text-gray-300 whitespace-pre">
                    {code}
                </code>
            </pre>
        </div>
    );
}

function NoteCard({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Globe;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-neutral-700">
                <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>
            </div>
        </div>
    );
}
