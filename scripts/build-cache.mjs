#!/usr/bin/env node
// Turbopack persistent build cache, kept in S3 instead of Vercel's build cache.
//
// WHY (measured 2026-10-09/10): a warm Turbopack compile takes ~71 s against ~4-5 min cold, but the
// cache is 7-12 GB (12.1 GB for the demos profile) and Vercel's build cache holds 4.75 GB INCLUDING
// node_modules, so Vercel would drop it — and node_modules with it. This script restores the cache
// from S3 before `next build` and saves it after, but saves only when the stored copy is older than
// BUILD_CACHE_SAVE_EVERY_MIN: a cache a few hours old still lets Turbopack recompile only what
// changed, and ~50 releases a day do not each need to pay the upload.
//
// The cache is stored as a plain tar: Turbopack's files are already compressed (zstd took 12.1 GB
// to only 10.2 GB), so compressing again costs minutes of CPU for ~15%.
//
// THE SWITCH: scripts/build-cache-policy.cjs (BUILD_CACHE_PROFILES, BUILD_CACHE_SAVE_EVERY_MIN) —
// next.config.js reads the same decision to turn Turbopack's cache on.
// ONE-BUILD OVERRIDES (put in the release commit message):
//   [cold-build]   ignore the stored cache: compile from scratch, then save a fresh cache
//   [no-cache]     this build neither restores nor saves (and compiles cold)
// Every outcome prints one "[build-cache] …" line; a failure never fails the build (cold compile).
//
// Usage: node scripts/build-cache.mjs restore|save
import { createHash, createHmac } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { join } from "node:path";
import { createRequire } from "node:module";

const { buildCacheDecision } = createRequire(import.meta.url)("./build-cache-policy.cjs");

const log = (msg) => console.log(`[build-cache] ${msg}`);
const DIST = ".next";
const CACHE_DIR = join(DIST, "cache");
const PART_BYTES = 128 * 1024 ** 2; // multipart part size (S3 allows up to 10,000 parts → 1.25 TB)
const PARALLEL_PARTS = 6;

export function settings(e = process.env) {
  const d = buildCacheDecision(e);
  const project = e.VERCEL_PROJECT_ID || "local";
  return {
    on: d.on,
    cold: d.cold,
    saveEveryMin: d.saveEveryMin,
    bucket: e.MATRX_BUILD_CACHE_BUCKET,
    region: e.MATRX_BUILD_CACHE_REGION || "us-east-1",
    key: `turbopack/${project}/${d.profile}/latest.tar`,
    accessKey: e.MATRX_BUILD_CACHE_AWS_ACCESS_KEY_ID,
    secretKey: e.MATRX_BUILD_CACHE_AWS_SECRET_ACCESS_KEY,
  };
}

// ── Minimal S3 SigV4 (UNSIGNED-PAYLOAD) ─────────────────────────────────────────────────────────
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const hmac = (k, s) => createHmac("sha256", k).update(s).digest();
const enc = (v) => encodeURIComponent(v).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export function signed(s, method, query = {}, extraHeaders = {}, now = new Date()) {
  const host = `${s.bucket}.s3.${s.region}.amazonaws.com`;
  const path = "/" + s.key.split("/").map(enc).join("/");
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);
  const qs = Object.keys(query).sort().map((k) => `${enc(k)}=${enc(query[k])}`).join("&");
  const headers = { host, "x-amz-content-sha256": "UNSIGNED-PAYLOAD", "x-amz-date": amzDate };
  for (const [k, v] of Object.entries(extraHeaders)) headers[k.toLowerCase()] = String(v);
  const names = Object.keys(headers).sort();
  const canonHeaders = names.map((n) => `${n}:${headers[n].trim()}\n`).join("");
  const signedHeaders = names.join(";");
  const canon = [method, path, qs, canonHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const scope = `${day}/${s.region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canon)].join("\n");
  const kSign = hmac(hmac(hmac(hmac("AWS4" + s.secretKey, day), s.region), "s3"), "aws4_request");
  const sig = createHmac("sha256", kSign).update(toSign).digest("hex");
  delete headers.host;
  return {
    url: `https://${host}${path}${qs ? "?" + qs : ""}`,
    headers: { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${s.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}` },
  };
}

/** Credentials for a small object in the build-cache bucket; null when this build has none. */
export function bucketObject(key, e = process.env) {
  if (!e.MATRX_BUILD_CACHE_BUCKET || !e.MATRX_BUILD_CACHE_AWS_ACCESS_KEY_ID || !e.MATRX_BUILD_CACHE_AWS_SECRET_ACCESS_KEY) return null;
  return {
    bucket: e.MATRX_BUILD_CACHE_BUCKET,
    region: e.MATRX_BUILD_CACHE_REGION || "us-east-1",
    key,
    accessKey: e.MATRX_BUILD_CACHE_AWS_ACCESS_KEY_ID,
    secretKey: e.MATRX_BUILD_CACHE_AWS_SECRET_ACCESS_KEY,
  };
}

export async function s3(s, method, { query, headers, body } = {}) {
  const r = signed(s, method, query, headers);
  const res = await fetch(r.url, { method, headers: r.headers, body, ...(body ? { duplex: "half" } : {}) });
  return res;
}

const done = (child, name) =>
  new Promise((ok, fail) => child.on("close", (c) => (c === 0 ? ok() : fail(new Error(`${name} exited ${c}`)))));
const secs = (t0) => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
const mb = (n) => `${(n / 1024 ** 2).toFixed(0)} MB`;

async function restore(s) {
  if (s.cold) return log("[cold-build] in the commit message: compiling from scratch (a fresh cache is saved after)");
  const t0 = Date.now();
  const res = await s3(s, "GET");
  if (res.status === 404) return log("no stored cache yet: cold compile (this build saves one)");
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const size = Number(res.headers.get("content-length") || 0);
  rmSync(CACHE_DIR, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  const tar = spawn("tar", ["-xf", "-", "-C", DIST], { stdio: ["pipe", "inherit", "inherit"] });
  await Promise.all([pipeline(Readable.fromWeb(res.body), tar.stdin), done(tar, "tar -x")]);
  log(`restored ${mb(size)} (stored ${res.headers.get("last-modified")}) in ${secs(t0)}`);
}

async function lastSaved(s) {
  const res = await s3(s, "HEAD");
  return res.ok ? new Date(res.headers.get("last-modified")).getTime() : 0;
}

/** Stream `tar` straight into an S3 multipart upload, PARALLEL_PARTS parts in flight. */
async function upload(s, stream) {
  const create = await s3(s, "POST", { query: { uploads: "" } });
  if (!create.ok) throw new Error(`CreateMultipartUpload ${create.status} ${(await create.text()).slice(0, 200)}`);
  const uploadId = /<UploadId>([^<]+)<\/UploadId>/.exec(await create.text())?.[1];
  if (!uploadId) throw new Error("CreateMultipartUpload returned no UploadId");
  const etags = [];
  const inflight = new Set();
  let total = 0;
  const send = async (partNumber, buf) => {
    for (let attempt = 1; ; attempt++) {
      const res = await s3(s, "PUT", { query: { partNumber: String(partNumber), uploadId }, headers: { "content-length": buf.length }, body: buf });
      if (res.ok) return (etags[partNumber - 1] = res.headers.get("etag"));
      if (attempt >= 3) throw new Error(`UploadPart ${partNumber}: ${res.status}`);
    }
  };
  try {
    let part = 1;
    let chunks = [];
    let size = 0;
    const flush = async () => {
      const buf = Buffer.concat(chunks, size);
      chunks = [];
      size = 0;
      total += buf.length;
      const p = send(part++, buf).finally(() => inflight.delete(p));
      inflight.add(p);
      if (inflight.size >= PARALLEL_PARTS) await Promise.race(inflight);
    };
    for await (const chunk of stream) {
      chunks.push(chunk);
      size += chunk.length;
      if (size >= PART_BYTES) await flush();
    }
    if (size > 0 || part === 1) await flush();
    await Promise.all(inflight);
    const xml = `<CompleteMultipartUpload>${etags.map((e, i) => `<Part><PartNumber>${i + 1}</PartNumber><ETag>${e}</ETag></Part>`).join("")}</CompleteMultipartUpload>`;
    const complete = await s3(s, "POST", { query: { uploadId }, headers: { "content-type": "application/xml" }, body: xml });
    const text = await complete.text();
    if (!complete.ok || text.includes("<Error>")) throw new Error(`CompleteMultipartUpload ${complete.status} ${text.slice(0, 200)}`);
    return total;
  } catch (e) {
    await s3(s, "DELETE", { query: { uploadId } }).catch(() => {});
    throw e;
  }
}

async function save(s) {
  if (!existsSync(CACHE_DIR)) return log("no .next/cache to save");
  const age = (Date.now() - (await lastSaved(s))) / 60000;
  if (!s.cold && age < s.saveEveryMin) return log(`stored cache is ${age.toFixed(0)} min old (< ${s.saveEveryMin}): not saving this build`);
  const t0 = Date.now();
  const tar = spawn("tar", ["-cf", "-", "-C", DIST, "cache"], { stdio: ["ignore", "pipe", "inherit"] });
  const [total] = await Promise.all([upload(s, tar.stdout), done(tar, "tar -c")]);
  log(`saved ${mb(total)} in ${secs(t0)}`);
}

async function main(cmd) {
  const s = settings();
  if (!s.on) return log(cmd === "restore" ? "off for this build (profile not in BUILD_CACHE_PROFILES, or [no-cache]): cold compile" : "off");
  if (!s.bucket || !s.accessKey || !s.secretKey) return log("on, but the bucket credentials are missing: cold compile, nothing saved");
  try {
    if (cmd === "restore") await restore(s);
    else if (cmd === "save") await save(s);
    else throw new Error(`unknown command ${cmd}`);
  } catch (e) {
    log(`${cmd} FAILED (${e.message}); the build continues ${cmd === "restore" ? "with a cold compile" : "without saving"}`);
    if (cmd === "restore") rmSync(CACHE_DIR, { recursive: true, force: true });
  } finally {
    // Never leave the multi-GB Turbopack cache for Vercel's own build cache: over its cap Vercel
    // discards the WHOLE cache, node_modules included, and every later install starts cold.
    if (cmd === "save") rmSync(CACHE_DIR, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) void main(process.argv[2]).catch((e) => { console.error(e); process.exitCode = 1; });
