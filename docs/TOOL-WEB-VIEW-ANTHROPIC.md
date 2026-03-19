This is a great find, Arman — and you're right, it's a powerful pattern. Let me break down everything I can extract from that HTML and the infrastructure behind it.

# docs/widget-architecture-spec.md

## What You're Looking At

The key piece is the iframe source:

```
https://d2334008dd18fa2a1057636ebfd7fa90.claudemcpcontent.com/mcp_apps?connect-src=...&resource-src=...&dev=true
```

Here's what we can deduce:

**1. The Domain Pattern: `{hash}.claudemcpcontent.com`**

That subdomain is a unique hash — likely derived from the content itself (a content-addressable hash, similar to how IPFS or Cloudflare Pages preview deploys work). This means each "widget" gets its own isolated origin. That's critical for security — every widget is sandboxed not just by the iframe `sandbox` attribute, but at the browser's same-origin policy level too. One widget can never touch another widget's state.

**2. The Sandbox Attributes**

```html
sandbox="allow-scripts allow-same-origin allow-forms"
allow="fullscreen *; clipboard-write *"
```

They allow JS execution and forms, but notably *don't* allow `allow-top-navigation`, `allow-popups`, or `allow-modals`. The widget can run code but can't escape its box — it can't redirect the parent page, open new windows, or trigger alerts. The `clipboard-write` permission is interesting — it lets widgets have "copy to clipboard" buttons.

**3. The CSP via Query Parameters**

```
connect-src=esm.sh+cdnjs.cloudflare.com+cdn.jsdelivr.net+unpkg.com
resource-src=esm.sh+cdnjs.cloudflare.com+cdn.jsdelivr.net+unpkg.com+assets.claude.ai
```

They're passing Content Security Policy directives *as query params* to the iframe host. The server at `claudemcpcontent.com` likely reads these and sets the actual CSP headers on the response. This is a whitelist of CDNs the widget code is allowed to fetch from — so the LLM-generated code can `import` from esm.sh, use Chart.js from cdnjs, etc., but can't phone home to arbitrary servers.

**4. The Container Pattern**

```html
<div id="mcp-app-placeholder-toolu_01Bgj...">  <!-- height: 0px -->
<div id="mcp-app-container-toolu_01Bgj...">    <!-- the actual iframe -->
```

The `toolu_` prefix in the ID tells us this is tied to a specific tool invocation in Claude's response. There's a placeholder div (initially zero height) and a container div — this is a classic pattern for streaming UIs where the placeholder reserves space, then gets swapped/expanded once the content is ready. The iframe height is set to `1017px`, which likely comes from a `postMessage` resize event from inside the iframe.

**5. The `dev=true` Flag**

Suggests there's a production vs development mode, probably controlling things like error overlays, source maps, or relaxed CSP for debugging.

## The Architecture (Reverse-Engineered)

Here's what I believe the full flow looks like:

1. **Claude generates widget code** (HTML/SVG/React) as part of a tool call (`visualize:show_widget`)
2. **The platform takes that code**, hashes it, and **stores it at a content-addressed URL** on `claudemcpcontent.com`
3. **The frontend receives the tool call response**, sees it's a widget, and **renders an iframe** pointing to that URL
4. **The iframe host server** serves the code with proper CSP headers derived from the query params
5. **The iframe communicates back** via `postMessage` for things like height resizing, and possibly `sendPrompt()` (which they expose as a global to let widgets send messages back to the chat)

## What This Means for AI Matrx

This is essentially what you've been building with your block/constitution system, but taken to its logical endpoint. Here's the key insight: **instead of rendering blocks inline in your React tree, you serve them as isolated micro-apps in iframes**.

The advantages are significant. Security isolation means LLM-generated code can't corrupt your parent app. Independent rendering means each widget can use whatever framework/library it wants without bloating your main bundle. Content-addressability means you get caching and deduplication for free. And the postMessage bridge gives you a controlled communication channel.

## A Blueprint for Your Team

Here's how I'd frame this for your meeting:

**Layer 1 — Widget Host Service (on Coolify)**

A lightweight Python/FastAPI service that accepts widget code (HTML/JS), hashes it, stores it (S3 or even just a KV store), and serves it back with proper CSP headers. Something like:

```
POST /widgets → accepts code, returns hash
GET /widgets/{hash} → serves the widget HTML with CSP headers
```

The CSP headers get built from a whitelist you control, potentially per-widget.

**Layer 2 — The iframe Wrapper (in Matrx Admin)**

A React component that takes a widget hash, renders an iframe pointing to your widget host, handles `postMessage` for resizing, and exposes a bridge for widget→parent communication (like your streaming constitution, but over postMessage instead of inline rendering).

**Layer 3 — The Bridge Protocol**

Define a small postMessage API:
- `{ type: 'resize', height: number }` — widget tells parent its height
- `{ type: 'action', payload: any }` — widget triggers something in the parent app
- `{ type: 'theme', vars: Record<string, string> }` — parent pushes CSS variables into the widget

**Layer 4 — AI Dream Integration**

When AI Dream's streaming output includes a structured block that's complex enough (interactive chart, quiz, diagram, etc.), instead of sending it as inline block data, it calls the widget host to store the rendered code and sends back a widget reference. Matrx Admin sees the reference and renders the iframe.

## The Key Decision Point

You don't have to go all-or-nothing. The smart play is probably a hybrid:

- **Simple blocks** (text, headers, lists, simple cards) → still render inline as you do now
- **Rich/interactive blocks** (charts, interactive diagrams, games, code playgrounds) → iframe widgets

This maps almost exactly to what Anthropic is doing — their simple text renders inline, but `show_widget` output goes to the iframe.

The biggest win here for you is that this completely decouples the widget rendering from your Matrx Admin bundle. Your AI can generate React, vanilla JS, D3, Three.js, whatever — and it all just works in the iframe without touching your build pipeline. That's the same freedom Anthropic gets by allowing imports from esm.sh/cdnjs/etc. inside the widget sandbox.

---------------



Great question — this is where the rubber meets the road. Let me break down each runtime environment and where the iframe-hosted widget pattern works cleanly versus where it falls apart.

## Web (React/Next.js — Matrx Admin)

**Verdict: Works perfectly. This is the native habitat.**

Iframes are a first-class browser primitive. Everything Anthropic is doing translates directly. You render an `<iframe>` component, point it at your widget host, communicate via `postMessage`, done. The CSP-via-query-params trick works great here because you control both the parent page and the widget host server.

The only nuance with Next.js specifically is SSR — iframes are client-only, so you'd want to wrap your widget component in a `dynamic(() => import(...), { ssr: false })` or just make sure it only renders client-side. Trivial.

## Web (Vite/React — Matrx Local's UI layer)

**Verdict: Works perfectly, with a small caveat.**

Since Matrx Local's UI is a Vite/React app running in a webview (Tauri, Electron, or similar), iframes still work — the webview is essentially a browser. But there's a key difference: **network access**.

In a browser, the iframe fetches from `widgets.aimatrx.com` or wherever your host lives. In a desktop app, the user might be offline, or you might want widgets to work without a round-trip to a remote server. Two options:

- **Online mode**: Works exactly like web. iframe points to your remote widget host. Simple.
- **Offline mode**: You'd need a local widget host. This is actually easy with Matrx Local's Python backend — spin up a tiny FastAPI route on localhost that serves widget HTML. The iframe points to `http://localhost:{port}/widgets/{hash}` instead. Same pattern, local server.

The Tauri webview's security model also supports iframe sandboxing, so you're good there.

## React Native (Expo — Matrx Mobile)

**Verdict: Works, but with real friction. This is where it gets interesting.**

React Native doesn't have native `<iframe>`. Instead you use `react-native-webview`, which is conceptually similar but mechanically different:

```jsx
<WebView
  source={{ uri: 'https://widgets.aimatrx.com/w/{hash}' }}
  // OR for inline HTML:
  source={{ html: widgetHtmlString }}
  javaScriptEnabled={true}
  originWhitelist={['*']}
  onMessage={(event) => {
    // This is your postMessage equivalent
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'resize') setHeight(data.height);
  }}
  style={{ height: widgetHeight }}
/>
```

**What works:**
- Rendering HTML/JS/CSS widgets — totally fine
- Communication via `onMessage` / `injectedJavaScript` — this is the postMessage equivalent
- Loading from a remote URL — works great
- Dynamic height — you inject JS that measures `document.body.scrollHeight` and posts it back

**What gets painful:**
- **Performance with many widgets.** Each WebView is expensive on mobile. If you have a chat stream with 5-10 widgets visible, you're running 5-10 WebView instances. That's heavy. On Android especially, each WebView is a separate process. You'd want to virtualize aggressively — only mount WebViews for widgets currently in the viewport, replace off-screen ones with static screenshots or placeholders.
- **Gesture conflicts.** Scrolling inside a WebView vs scrolling the parent FlatList/ScrollView is a classic pain point. You'll need to carefully manage `scrollEnabled` on the WebView and `nestedScrollEnabled` on the parent.
- **No shared CSS variables.** In web, the parent can push theme vars into the iframe. In React Native, you'd need to pass theme data as query params or inject it via `injectedJavaScript`. Not hard, just different.
- **Cold start latency.** WebViews take a moment to initialize on mobile. For simple widgets, you'll notice a flash. Consider showing a skeleton/placeholder while it loads.

**The hybrid approach for mobile:**

This is where your instinct about simple blocks rendering natively was exactly right. On mobile, the calculus shifts:

- **Simple blocks** (text, cards, lists, timelines, flashcards) → Render as **native React Native components**. Fast, smooth, gesture-friendly.
- **Rich interactive blocks** (charts, interactive diagrams, code playgrounds, games) → Render in a **WebView widget**. Accept the overhead because the interactivity justifies it.

This means your "constitution" / block type system needs a `renderMode` flag:

```typescript
type BlockType = {
  kind: 'timeline' | 'quiz' | 'chart' | 'diagram' | ...;
  renderMode: 'native' | 'webview';  // per-platform override possible
  // ...
};
```

## Plain HTML (no framework)

**Verdict: Works trivially. This is actually the simplest case.**

If you're rendering widgets in a plain HTML page (say, a public-facing marketing page, an email embed, or a lightweight viewer), it's just:

```html
<iframe
  src="https://widgets.aimatrx.com/w/{hash}"
  sandbox="allow-scripts"
  style="width:100%; border:none; height:400px;"
></iframe>
```

No framework needed. This is one of the biggest advantages of the iframe pattern — **widgets become embeddable anywhere**. Blog posts, docs, external sites, email (well, some email clients), Notion embeds, etc.

## Summary Matrix

| Environment | iframe Works? | Communication | Offline? | Performance Concern |
|---|---|---|---|---|
| **Next.js (Matrx Admin)** | Native | postMessage | N/A (always online) | None |
| **Vite (Matrx Local)** | Native | postMessage | Local FastAPI host | None |
| **React Native (Mobile)** | Via WebView | onMessage bridge | Cache HTML bundles | Heavy with many widgets |
| **Plain HTML** | Native | postMessage | N/A | None |

## The Architecture Recommendation

Build the system in layers so it works everywhere:

**1. Widget Host Service** — One service, serves widgets by hash. Works for all platforms.

**2. Platform-specific renderers:**
- Web: thin `<iframe>` wrapper component
- Mobile: `<WebView>` wrapper with height management and virtualization
- Both share the same postMessage/onMessage protocol

**3. The Block Constitution gets a `renderStrategy` per platform:**
```typescript
const blockConfig = {
  'interactive-chart': {
    web: 'iframe-widget',
    mobile: 'webview-widget',
  },
  'timeline': {
    web: 'inline-react',        // simple enough to render inline
    mobile: 'native-component', // native RN component
  },
  'code-playground': {
    web: 'iframe-widget',
    mobile: 'webview-widget',   // no native equivalent
  },
};
```

The real power move is that your widget host doesn't care who's consuming it. Web, mobile, desktop, third-party embeds — it's just serving HTML at a URL. The consumers adapt to their platform constraints.

---------------







