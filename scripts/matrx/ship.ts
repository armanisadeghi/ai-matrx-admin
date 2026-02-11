#!/usr/bin/env tsx
/**
 * Matrx Ship CLI
 *
 * Universal deployment tool that:
 * 1. Collects git metadata (commit hash, message, code stats)
 * 2. Sends version data to the matrx-ship API
 * 3. Stages all changes
 * 4. Creates git commit
 * 5. Pushes to remote
 *
 * Usage:
 *   matrx-ship "commit message"             # Patch bump
 *   matrx-ship --minor "commit message"     # Minor bump
 *   matrx-ship --major "commit message"     # Major bump
 *   matrx-ship init --url URL --key KEY     # Configure for a project
 *   matrx-ship status                       # Show current version
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";

// ── Configuration ────────────────────────────────────────────────────

interface ShipConfig {
  url: string;
  apiKey: string;
  projectName?: string;
}

function findConfigFile(): string | null {
  let dir = process.cwd();
  while (true) {
    const configPath = path.join(dir, ".matrx-ship.json");
    if (existsSync(configPath)) return configPath;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Check if a URL looks like an unconfigured placeholder.
 */
function isPlaceholderUrl(url: string): boolean {
  return (
    url.includes("yourdomain.com") ||
    url.includes("YOUR") ||
    url.includes("example.com") ||
    url.includes("localhost") ||
    url === "" ||
    url === "https://" ||
    url === "http://"
  );
}

/**
 * Check if an API key looks like a placeholder.
 */
function isPlaceholderKey(key: string): boolean {
  return (
    key === "" ||
    key.includes("YOUR") ||
    key.includes("your") ||
    key.includes("xxx") ||
    key === "sk_ship_YOUR_API_KEY_HERE"
  );
}

function loadConfig(): ShipConfig {
  // Check environment variables first
  const envUrl = process.env.MATRX_SHIP_URL;
  const envKey = process.env.MATRX_SHIP_API_KEY;

  if (envUrl && envKey) {
    return { url: envUrl.replace(/\/+$/, ""), apiKey: envKey };
  }

  // Check config file
  const configPath = findConfigFile();
  if (!configPath) {
    console.error("❌ No .matrx-ship.json found in this project.");
    console.error("");
    console.error("   To set up, run:");
    console.error("     npx tsx scripts/matrx/ship.ts init --url URL --key API_KEY");
    console.error("");
    console.error("   Or set environment variables:");
    console.error("     export MATRX_SHIP_URL=https://your-ship-instance.com");
    console.error("     export MATRX_SHIP_API_KEY=sk_ship_xxxxx");
    process.exit(1);
  }

  let config: ShipConfig;
  try {
    const raw = readFileSync(configPath, "utf-8");
    config = JSON.parse(raw);
  } catch {
    console.error(`❌ Failed to parse ${configPath}`);
    console.error("   Make sure it contains valid JSON with 'url' and 'apiKey'.");
    process.exit(1);
  }

  if (!config.url || !config.apiKey) {
    console.error(`❌ Missing fields in ${configPath}`);
    console.error("   Required: { \"url\": \"...\", \"apiKey\": \"...\" }");
    process.exit(1);
  }

  // Check for placeholder values
  if (isPlaceholderUrl(config.url)) {
    console.error("❌ Your .matrx-ship.json still has a placeholder URL.");
    console.error(`   Current:  ${config.url}`);
    console.error("");
    console.error("   You need a running matrx-ship server instance first.");
    console.error("   Once you have one, update .matrx-ship.json with the real URL, or run:");
    console.error("     npx tsx scripts/matrx/ship.ts init --url https://your-real-url.com --key YOUR_KEY");
    console.error("");
    console.error("   No ship instance yet? See: https://github.com/armanisadeghi/matrx-ship/blob/main/DEPLOY.md");
    process.exit(1);
  }

  if (isPlaceholderKey(config.apiKey)) {
    console.error("❌ Your .matrx-ship.json still has a placeholder API key.");
    console.error("   Update it with the real key from your matrx-ship instance.");
    console.error(`   Config file: ${configPath}`);
    process.exit(1);
  }

  return { ...config, url: config.url.replace(/\/+$/, "") };
}

// ── Git Helpers ──────────────────────────────────────────────────────

function getGitCommit(): string | null {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return null;
  }
}

function getCommitMessage(): string | null {
  try {
    return execSync("git log -1 --pretty=%B").toString().trim();
  } catch {
    return null;
  }
}

function getCodeStats(): {
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
} {
  try {
    const stats = execSync("git diff --numstat HEAD~1 HEAD")
      .toString()
      .trim();
    let linesAdded = 0;
    let linesDeleted = 0;
    let filesChanged = 0;

    if (stats) {
      for (const line of stats.split("\n")) {
        const [added, deleted] = line.trim().split(/\s+/);
        if (added !== "-" && deleted !== "-") {
          linesAdded += parseInt(added) || 0;
          linesDeleted += parseInt(deleted) || 0;
          filesChanged += 1;
        }
      }
    }

    return { linesAdded, linesDeleted, filesChanged };
  } catch {
    return { linesAdded: 0, linesDeleted: 0, filesChanged: 0 };
  }
}

function hasUncommittedChanges(): boolean {
  try {
    const status = execSync("git status --porcelain", {
      encoding: "utf-8",
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ── API Client ───────────────────────────────────────────────────────

async function checkServerReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${url}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

async function shipVersion(
  config: ShipConfig,
  payload: Record<string, unknown>,
): Promise<{
  ok: boolean;
  data: Record<string, unknown>;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${config.url}/api/ship`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    return { ok: response.ok, data };
  } catch (error) {
    // Translate network errors into clear messages
    const msg =
      error instanceof Error ? error.message : String(error);

    if (msg.includes("abort") || msg.includes("timeout")) {
      throw new Error(
        `Connection to ${config.url} timed out after 15 seconds.\n` +
          "   Is the matrx-ship server running?",
      );
    }
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      throw new Error(
        `Cannot reach ${config.url}\n` +
          "   Possible causes:\n" +
          "     - The matrx-ship server is not running\n" +
          "     - The URL in .matrx-ship.json is wrong\n" +
          "     - DNS hasn't propagated yet\n" +
          "     - Network/firewall is blocking the connection\n" +
          `\n   To verify, try: curl ${config.url}/api/health`,
      );
    }
    throw new Error(`Network error: ${msg}`);
  }
}

async function getStatus(config: ShipConfig): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${config.url}/api/version`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();

    console.log("\n📦 Current Version Status");
    console.log(`   Server:  ${config.url}`);
    console.log(`   Version: v${data.version}`);
    console.log(`   Build:   #${data.buildNumber}`);
    console.log(`   Status:  ${data.deploymentStatus || "unknown"}`);
    if (data.gitCommit) console.log(`   Commit:  ${data.gitCommit}`);
    if (data.commitMessage) console.log(`   Message: ${data.commitMessage}`);
    console.log(`   Deployed: ${data.deployedAt}`);
    console.log();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("abort")) {
      console.error(`❌ Cannot reach ${config.url}`);
      console.error("   Is the matrx-ship server running?");
      console.error(`   Try: curl ${config.url}/api/health`);
    } else {
      console.error("❌ Failed to fetch status:", msg);
    }
    process.exit(1);
  }
}

// ── Commands ─────────────────────────────────────────────────────────

async function handleInit(args: string[]): Promise<void> {
  let url = "";
  let key = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) {
      url = args[i + 1];
      i++;
    } else if (args[i] === "--key" && args[i + 1]) {
      key = args[i + 1];
      i++;
    }
  }

  if (!url || !key) {
    console.error("❌ Usage: matrx-ship init --url URL --key API_KEY");
    console.error("");
    console.error("   Example:");
    console.error("     npx tsx scripts/matrx/ship.ts init --url https://ship-myproject.example.com --key sk_ship_abc123");
    process.exit(1);
  }

  // Strip trailing slash
  url = url.replace(/\/+$/, "");

  // Verify connection
  console.log(`🔍 Checking connection to ${url}...`);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${url}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    if (data.status !== "ok") {
      throw new Error("Health check returned non-ok status");
    }
    console.log(`✅ Connected to ${data.service} (project: ${data.project})`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Cannot reach ${url}/api/health`);
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      console.error("   The server doesn't appear to be running at that URL.");
    } else if (msg.includes("abort")) {
      console.error("   Connection timed out after 10 seconds.");
    } else {
      console.error(`   Error: ${msg}`);
    }
    console.error("");
    console.error("   Make sure your matrx-ship instance is deployed and accessible.");
    console.error("   Deploy guide: https://github.com/armanisadeghi/matrx-ship/blob/main/DEPLOY.md");
    process.exit(1);
  }

  const config: ShipConfig = { url, apiKey: key };
  const configPath = path.join(process.cwd(), ".matrx-ship.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`📄 Config saved to ${configPath}`);
  console.log('\n   You can now run: pnpm ship "your commit message"');
  console.log();
}

async function handleShip(args: string[]): Promise<void> {
  const isMajor = args.includes("--major");
  const isMinor = args.includes("--minor");
  const commitMessage = args.find((arg) => !arg.startsWith("--"));

  if (!commitMessage) {
    console.error("❌ Error: Commit message is required");
    console.error('\n   Usage: pnpm ship "Your commit message"');
    console.error('          pnpm ship:minor "Your commit message"');
    console.error('          pnpm ship:major "Your commit message"');
    process.exit(1);
  }

  if (!isGitRepo()) {
    console.error("❌ Error: Not in a git repository");
    process.exit(1);
  }

  if (!hasUncommittedChanges()) {
    console.log("⚠️  No uncommitted changes detected. Nothing to ship!");
    process.exit(0);
  }

  // Load and validate config (exits with clear message if misconfigured)
  const config = loadConfig();
  const bumpType = isMajor ? "major" : isMinor ? "minor" : "patch";

  console.log("🚀 Starting ship process...\n");

  // Step 1: Send version data to API
  console.log("📦 Step 1/4: Creating version...");
  const gitCommit = getGitCommit();
  const codeStats = getCodeStats();

  try {
    const result = await shipVersion(config, {
      bumpType,
      gitCommit,
      commitMessage,
      linesAdded: codeStats.linesAdded,
      linesDeleted: codeStats.linesDeleted,
      filesChanged: codeStats.filesChanged,
    });

    if (!result.ok) {
      throw new Error(
        (result.data.error as string) || "Failed to create version",
      );
    }

    if (result.data.duplicate) {
      console.log(
        `⚠️  Version already exists for commit ${gitCommit}. Continuing...`,
      );
    } else {
      console.log(
        `✅ Version v${result.data.version} (build #${result.data.buildNumber}) created`,
      );
    }
  } catch (error) {
    console.error("\n❌ Failed to create version");
    console.error(
      "   ",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }

  // Step 2: Stage all changes
  console.log("\n📝 Step 2/4: Staging changes...");
  try {
    execSync("git add .", { stdio: "inherit" });
    console.log("✅ Changes staged");
  } catch {
    console.error("\n❌ Failed to stage changes");
    process.exit(1);
  }

  // Step 3: Create commit
  console.log("\n💾 Step 3/4: Creating commit...");
  try {
    const escapedMessage = commitMessage.replace(/"/g, '\\"');
    execSync(`git commit -m "${escapedMessage}"`, { stdio: "inherit" });
    console.log("✅ Commit created");
  } catch {
    console.error("\n❌ Failed to create commit");
    console.error("   Tip: Make sure you have changes to commit");
    process.exit(1);
  }

  // Step 4: Push to remote
  console.log("\n⬆️  Step 4/4: Pushing to remote...");
  try {
    execSync("git push", { stdio: "inherit" });
    console.log("✅ Pushed to remote");
  } catch {
    console.error("\n❌ Failed to push to remote");
    console.error(
      "   Your commit was created locally but not pushed.",
    );
    console.error("   You can manually push with: git push");
    process.exit(1);
  }

  console.log("\n✨ Ship complete!");
  console.log(`   Commit: "${commitMessage}"`);
  console.log("   Changes have been pushed to remote\n");
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "init") {
    await handleInit(args.slice(1));
  } else if (command === "status") {
    const config = loadConfig();
    await getStatus(config);
  } else if (command === "help" || command === "--help" || command === "-h") {
    console.log(`
Matrx Ship CLI - Universal Deployment Tool

Usage:
  pnpm ship "commit message"             Patch version bump + deploy
  pnpm ship:minor "commit message"       Minor version bump + deploy
  pnpm ship:major "commit message"       Major version bump + deploy

Commands:
  init --url URL --key KEY               Configure for this project
  status                                 Show current version from server
  help                                   Show this help

Environment Variables (override .matrx-ship.json):
  MATRX_SHIP_URL       Ship instance URL
  MATRX_SHIP_API_KEY   API key

Setup:
  1. Deploy a matrx-ship instance (see DEPLOY.md)
  2. Run: npx tsx scripts/matrx/ship.ts init --url URL --key KEY
  3. Ship: pnpm ship "your commit message"
`);
  } else {
    await handleShip(args);
  }
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
