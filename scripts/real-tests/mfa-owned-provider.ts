/** Real GoTrue + owned PostgreSQL rehearsal. Never point this at hosted Auth.
 * MATRX_MFA_AUTH_URL=http://127.0.0.1:<owned-port> pnpm exec tsx scripts/real-tests/mfa-owned-provider.ts
 * The owned provider must allow email signup/autoconfirm. Platform support-session I/O
 * is deliberately substituted; this is not proof of hosted enforcement or recovery policy.
 */
import assert from "node:assert/strict";
import { totp } from "../lib/totp";
import { randomBytes } from "node:crypto";
import { createServer, request as httpRequest } from "node:http";
import { AuthClient } from "@supabase/supabase-js";

const target = new URL(process.env.MATRX_MFA_AUTH_URL ?? "http://refused.invalid");
assert.equal(target.hostname, "127.0.0.1", "Only an explicitly owned loopback Auth is allowed");
assert.equal(target.protocol, "http:");
assert.ok(target.port, "An explicit owned port is required");
process.env.NEXT_PUBLIC_SUPABASE_URL = target.origin;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "owned-loopback-publishable";

let checks = 0;
const check = (value: unknown, message: string) => { assert.ok(value, message); checks++; console.log(`PASS ${message}`); };


async function main() {
  const { readAuthenticators, enrollAuthenticator, verifyAuthenticator, removeAuthenticator, generateRecoveryCodes, verifyRecoveryCode } = await import("../../features/user-profile/account-access/mfa");
  const clients: Array<InstanceType<typeof AuthClient>> = [];
  const client = () => {
    const auth = new AuthClient({ url: target.origin, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
    clients.push(auth); return { auth };
  };
  let gatewayCalls = 0;
  const gateway = createServer((incoming, outgoing) => {
    if (incoming.headers.apikey !== "owned-loopback-publishable" || !incoming.headers.authorization?.startsWith("Bearer ")) {
      outgoing.writeHead(401); outgoing.end('{"message":"Both API key and user token required"}'); return;
    }
    gatewayCalls++;
    const upstream = httpRequest(new URL(incoming.url ?? "/", target), { method: incoming.method, headers: { ...incoming.headers, host: target.host } }, response => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers); response.pipe(outgoing);
    });
    upstream.on("error", () => { outgoing.writeHead(502); outgoing.end(); }); incoming.pipe(upstream);
  });
  await new Promise<void>(resolve => gateway.listen(0, "127.0.0.1", resolve));
  const address = gateway.address(); assert.ok(address && typeof address !== "string");
  const destination = { authUrl: `http://127.0.0.1:${address.port}`, publishableKey: "owned-loopback-publishable", guard: async (_token: string) => {} };
  try {
    const subject = client();
    const email = `mfa-${randomBytes(8).toString("hex")}@admin.test`;
    const password = randomBytes(20).toString("base64url");
    const signup = await subject.auth.signUp({ email, password }); if (signup.error) throw signup.error;
    const uid = signup.data.user?.id; assert.ok(uid);
    check(!(await readAuthenticators(subject)).elevated, "real password session starts at AAL1");
    const first = await enrollAuthenticator(uid, "Primary device", subject, destination);
    check((await readAuthenticators(subject)).factors.some(f => f.id === first.id && !f.verified), "enrollment remains unverified until a code is accepted");
    const wrong = ((Number(totp(first.secret)) + 1) % 1000000).toString().padStart(6, "0");
    await assert.rejects(() => verifyAuthenticator(uid, first.id, wrong, subject, destination)); checks++;
    check(!(await readAuthenticators(subject)).elevated, "incorrect code cannot elevate the session");
    await verifyAuthenticator(uid, first.id, totp(first.secret), subject, destination);
    check((await readAuthenticators(subject)).elevated, "verification refreshes the real browser session to AAL2");
    await first.cancel();
    check((await readAuthenticators(subject)).factors.some(f => f.id === first.id && f.verified), "late cleanup preserves an already verified factor");
    const second = await enrollAuthenticator(uid, "Recovery device", subject, destination);
    await verifyAuthenticator(uid, second.id, totp(second.secret), subject, destination);
    check((await readAuthenticators(subject)).factors.filter(f => f.verified).length === 2, "independent second device is verified");
    const fresh = client(); const login = await fresh.auth.signInWithPassword({ email, password }); if (login.error) throw login.error;
    check(!(await readAuthenticators(fresh)).elevated, "fresh sign-in stays AAL1 despite enrolled factors");
    await assert.rejects(() => removeAuthenticator(uid, first.id, fresh, destination)); checks++;
    await verifyAuthenticator(uid, second.id, totp(second.secret), fresh, destination);
    check((await readAuthenticators(fresh)).elevated, "second device recovers verification without the first device");
    await removeAuthenticator(uid, first.id, fresh, destination);
    check(!(await readAuthenticators(fresh)).factors.some(f => f.id === first.id), "recovery device removes lost primary");
    const pending = await enrollAuthenticator(uid, "Cancelled setup", fresh, destination); await pending.cancel();
    check(!(await readAuthenticators(fresh)).factors.some(f => f.id === pending.id), "cancel removes pending enrollment");
    const refused = { ...destination, guard: async () => { throw new Error("support session"); } };
    const beforeRefusal = gatewayCalls;
    for (const operation of [() => enrollAuthenticator(uid, "Refused", fresh, refused), () => verifyAuthenticator(uid, second.id, totp(second.secret), fresh, refused), () => removeAuthenticator(uid, second.id, fresh, refused)]) {
      await assert.rejects(operation, /support session/); checks++;
    }
    check(gatewayCalls === beforeRefusal, "all three support refusals occur before MFA HTTP");
    await assert.rejects(() => verifyAuthenticator(uid, second.id, "12345", fresh, destination), /six-digit/); checks++;
    const other = client(); const otherEmail = `mfa-${randomBytes(8).toString("hex")}@admin.test`;
    const otherPassword = randomBytes(20).toString("base64url"); const otherSignup = await other.auth.signUp({ email: otherEmail, password: otherPassword }); if (otherSignup.error) throw otherSignup.error;
    const otherId = otherSignup.data.user?.id; assert.ok(otherId);
    const oldRead = await readAuthenticators(fresh);
    const switched = { ...destination, guard: async () => { const loginB = await fresh.auth.signInWithPassword({ email: otherEmail, password: otherPassword }); if (loginB.error) throw loginB.error; } };
    const duringSwitch = await enrollAuthenticator(oldRead.userId, "Interrupted setup", fresh, switched);
    check((await readAuthenticators(fresh)).userId === otherId && (await readAuthenticators(fresh)).factors.length === 0, "switch during guard does not enroll on the new identity");
    await duringSwitch.cancel();
    check(!(await readAuthenticators(other)).factors.length, "abandoned cleanup preserves the new identity");
    await assert.rejects(() => removeAuthenticator(uid, second.id, fresh, destination), /sign-in changed/); checks++;
    const back = await fresh.auth.signInWithPassword({ email, password }); if (back.error) throw back.error;
    await verifyAuthenticator(uid, second.id, totp(second.secret), fresh, destination);
    check(!(await readAuthenticators(fresh)).factors.some(f => f.id === duringSwitch.id), "abandoned original-identity factor is actually removed");
    const beforeCodes = await generateRecoveryCodes(uid, false, fresh, destination);
    check(beforeCodes.length > 0 && new Set(beforeCodes).size === beforeCodes.length, "native provider returns distinct recovery codes once");
    check((await readAuthenticators(fresh)).hasRecoveryCodes, "provider reports a verified recovery-code factor");
    const recovery = client(); const recoveryLogin = await recovery.auth.signInWithPassword({ email, password }); if (recoveryLogin.error) throw recoveryLogin.error;
    await assert.rejects(() => generateRecoveryCodes(uid, true, recovery, destination)); checks++;
    const afterCodes = await generateRecoveryCodes(uid, true, fresh, destination);
    await assert.rejects(() => verifyRecoveryCode(uid, beforeCodes[0], recovery, destination)); checks++;
    check(!(await readAuthenticators(recovery)).elevated, "replaced codes cannot elevate a password session");
    const another = client(); const anotherLogin = await another.auth.signInWithPassword({ email, password }); if (anotherLogin.error) throw anotherLogin.error;
    await verifyRecoveryCode(uid, afterCodes[0].toUpperCase().replace(/(.{4})/g, "$1- "), recovery, destination);
    check((await readAuthenticators(recovery)).elevated, "saved recovery code issues real AAL2 without the lost authenticator");
    check(Boolean((await another.auth.refreshSession()).error), "recovery invalidates other password-only sessions at the provider");
    const replay = client(); const replayLogin = await replay.auth.signInWithPassword({ email, password }); if (replayLogin.error) throw replayLogin.error;
    await assert.rejects(() => verifyRecoveryCode(uid, afterCodes[0], replay, destination)); checks++;
    check(!(await readAuthenticators(replay)).elevated, "a used recovery code cannot be replayed");
    const recoveryRefusals = gatewayCalls;
    await assert.rejects(() => generateRecoveryCodes(uid, true, recovery, refused), /support session/); checks++;
    await assert.rejects(() => verifyRecoveryCode(uid, afterCodes[1], replay, refused), /support session/); checks++;
    check(gatewayCalls === recoveryRefusals, "both recovery mutations refuse support context before HTTP");
    const switchedRecovery = { ...destination, guard: async () => { const b = await replay.auth.signInWithPassword({ email: otherEmail, password: otherPassword }); if (b.error) throw b.error; } };
    await verifyRecoveryCode(uid, afterCodes[1], replay, switchedRecovery);
    check((await readAuthenticators(replay)).userId === otherId && !(await readAuthenticators(replay)).elevated, "recovery crossing an identity switch never elevates the new identity");
    await assert.rejects(() => generateRecoveryCodes(uid, true, replay, destination), /sign-in changed/); checks++;
    const interrupted = { ...destination, guard: async () => { const b = await fresh.auth.signInWithPassword({ email: otherEmail, password: otherPassword }); if (b.error) throw b.error; } };
    await generateRecoveryCodes(uid, true, fresh, interrupted); // Deliberately discard the one-time response, as a closed view would.
    check((await readAuthenticators(fresh)).userId === otherId && !(await readAuthenticators(fresh)).hasRecoveryCodes, "interrupted code replacement never attaches codes to the new identity");
    const restored = await fresh.auth.signInWithPassword({ email, password }); if (restored.error) throw restored.error;
    await verifyAuthenticator(uid, second.id, totp(second.secret), fresh, destination);
    const restoredCodes = await generateRecoveryCodes(uid, true, fresh, destination);
    check(restoredCodes.length > 0, "retained authenticator restores recovery codes after an interrupted display");
    const restoredLogin = await replay.auth.signInWithPassword({ email, password }); if (restoredLogin.error) throw restoredLogin.error;
    await assert.rejects(() => verifyRecoveryCode(uid, afterCodes[2], replay, destination)); checks++;
    await verifyRecoveryCode(uid, restoredCodes[0], replay, destination);
    check((await readAuthenticators(replay)).elevated, "regenerated post-interruption code is usable while earlier sets are invalid");
    await removeAuthenticator(uid, second.id, recovery, destination);
    check((await readAuthenticators(recovery)).factors.length === 0, "explicit final removal leaves no factors");
    check(gatewayCalls > 0, "real SDK mutations passed a gateway requiring API key and bound user token");
    console.log(JSON.stringify({ checks, provider: "GoTrue v2.197.0", target: target.origin, platformSupportGuard: "substituted", hostedFactorsTouched: false }));
  } finally {
    for (const c of clients) await c.signOut({ scope: "local" });
    await new Promise<void>((resolve, reject) => gateway.close(error => error ? reject(error) : resolve()));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Owned MFA rehearsal failed"); process.exitCode = 1; });
