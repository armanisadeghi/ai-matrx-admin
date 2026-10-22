// Chromium launch args for a cloud container whose HTTPS goes through the
// agent egress proxy (HTTPS_PROXY + the CA bundle at /root/.ccr/ca-bundle.crt).
// The proxy re-terminates TLS, so the browser must trust its CA — by pinned key
// hash, never a blanket TLS disable (docs/official/browser-testing.md). On a Mac
// (no HTTPS_PROXY, no bundle) this returns [] and changes nothing.
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const CA_BUNDLE = "/root/.ccr/ca-bundle.crt";

/** @param {string} tag — the calling script's name, for the one warning line. */
export function egressProxyBrowserArgs(tag) {
  const args = [];
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) {
    args.push(`--proxy-server=${proxy}`);
    args.push("--proxy-bypass-list=<local>;*.localhost;localhost;127.0.0.1");
  }
  if (!existsSync(CA_BUNDLE)) return args;
  try {
    const pems =
      readFileSync(CA_BUNDLE, "utf8").match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
    const hashes = [];
    for (const pem of pems) {
      try {
        hashes.push(
          execSync(
            "openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl base64",
            { input: pem, encoding: "utf8", shell: "/bin/bash", stdio: ["pipe", "pipe", "ignore"] },
          ).trim(),
        );
      } catch {
        /* a certificate openssl cannot read is skipped */
      }
    }
    if (hashes.length) args.push(`--ignore-certificate-errors-spki-list=${hashes.join(",")}`);
  } catch {
    console.error(`[${tag}] could not derive CA key hashes; continuing without them`);
  }
  return args;
}
