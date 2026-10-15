// A held test run's page must never hot-reload (components/dev/HeldRunHmrGuard.tsx): Next's
// hot-reload client gets a socket that OPENS (so it never counts failed reconnects, which also end
// in a reload) and never delivers a message; every other socket is the real one.
//   node --test components/dev/heldRunHmrScript.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { HELD_RUN_HMR_SCRIPT } from "./heldRunHmrScript.ts";

let realCalls;
function install() {
  realCalls = [];
  function RealWebSocket(url) {
    realCalls.push(url);
    this.url = url;
  }
  const attrs = new Set();
  globalThis.window = { WebSocket: RealWebSocket };
  globalThis.document = { documentElement: { setAttribute: (k) => attrs.add(k), hasAttribute: (k) => attrs.has(k) } };
  globalThis.Event ??= class { constructor(type) { this.type = type; } };
  new Function("window", "document", HELD_RUN_HMR_SCRIPT)(globalThis.window, globalThis.document);
}

beforeEach(install);

test("the hot-reload socket opens, stays silent, and never touches the network", async () => {
  const socket = new window.WebSocket("ws://run-a.localhost:3001/_next/hmr?id=1");
  let opened = 0;
  let messages = 0;
  socket.onopen = () => opened++;
  socket.addEventListener("message", () => messages++);
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(realCalls, []);
  assert.equal(opened, 1);
  assert.equal(socket.readyState, window.WebSocket.OPEN);
  socket.send("ping");
  assert.equal(messages, 0);
  assert.ok(document.documentElement.hasAttribute("data-matrx-held-run"));
});

test("every other socket (realtime, agent streams) is the real WebSocket", () => {
  new window.WebSocket("wss://db.matrxserver.com/realtime/v1/websocket");
  assert.deepEqual(realCalls, ["wss://db.matrxserver.com/realtime/v1/websocket"]);
});

test("installing twice keeps one guard", () => {
  const first = window.WebSocket;
  new Function("window", "document", HELD_RUN_HMR_SCRIPT)(window, document);
  assert.equal(window.WebSocket, first);
});
