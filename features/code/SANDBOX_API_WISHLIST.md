# Sandbox API wishlist — RETIRED

The sandbox-side wishlist that lived here has shipped. The orchestrator now
exposes the full v0.2.0 API on both the EC2 and hosted tiers — verified via
`GET /api-surface` — and matrx-admin consumes everything that previously
lived on this list (structured FS, streaming exec, PTY, git, ripgrep
search, filesystem watch, processes, ports, templates, extend, heartbeat,
batch read/write, upload/download).

For the live capability snapshot, the per-route status, and any remaining
gaps, see [`SYSTEM_STATE.md` §3](./SYSTEM_STATE.md#3-sandbox-api-delivery-audit-verified-live-20260425).

This file is intentionally kept (rather than deleted) so older deep-links
and agent context references resolve to a clear pointer instead of a 404.
Do not re-introduce the audit table here — update `SYSTEM_STATE.md` §3.
