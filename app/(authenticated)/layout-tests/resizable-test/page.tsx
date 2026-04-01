"use client";

/**
 * Isolated test page for react-resizable-panels v4
 * URL: /layout-tests/resizable-test
 *
 * No outer shells, no layouts, no providers from parent feature code.
 * Just a raw test of Panel + Group + Separator.
 */

import React, { useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

// ─── tiny inline helpers so this file has zero external deps ────────────────

function Box({ label, bg = "bg-blue-100" }: { label: string; bg?: string }) {
  return (
    <div
      className={`${bg} flex items-center justify-center h-full w-full text-sm font-mono border border-dashed border-gray-400`}
    >
      {label}
    </div>
  );
}

function SeparatorH() {
  return (
    <Separator
      style={{
        width: 6,
        flexShrink: 0,
        background: "#888",
        cursor: "col-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{ width: 2, height: 40, background: "#555", borderRadius: 1 }}
      />
    </Separator>
  );
}

function SeparatorV() {
  return (
    <Separator
      style={{
        height: 6,
        flexShrink: 0,
        background: "#888",
        cursor: "row-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{ height: 2, width: 40, background: "#555", borderRadius: 1 }}
      />
    </Separator>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

/**
 * Test 1: Most basic possible horizontal split.
 * No className on Panel, no style overrides — pure defaults.
 */
function Test1() {
  return (
    <div style={{ width: "100%", height: 200, border: "2px solid red" }}>
      <Group orientation="horizontal">
        <Panel defaultSize={30}>
          <Box label="LEFT 30%" bg="bg-red-100" />
        </Panel>
        <SeparatorH />
        <Panel defaultSize={70}>
          <Box label="RIGHT 70%" bg="bg-green-100" />
        </Panel>
      </Group>
    </div>
  );
}

/**
 * Test 2: Same, but parent uses flex instead of explicit px height.
 */
function Test2() {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        height: 200,
        border: "2px solid blue",
      }}
    >
      <Group orientation="horizontal" style={{ flex: 1 }}>
        <Panel defaultSize={30}>
          <Box label="LEFT 30%" bg="bg-blue-100" />
        </Panel>
        <SeparatorH />
        <Panel defaultSize={70}>
          <Box label="RIGHT 70%" bg="bg-yellow-100" />
        </Panel>
      </Group>
    </div>
  );
}

/**
 * Test 3: Vertical split.
 */
function Test3() {
  return (
    <div style={{ width: 400, height: 300, border: "2px solid green" }}>
      <Group orientation="vertical">
        <Panel defaultSize={40}>
          <Box label="TOP 40%" bg="bg-pink-100" />
        </Panel>
        <SeparatorV />
        <Panel defaultSize={60}>
          <Box label="BOTTOM 60%" bg="bg-teal-100" />
        </Panel>
      </Group>
    </div>
  );
}

/**
 * Test 4: Nested — horizontal outer, left panel has a vertical inner Group.
 */
function Test4() {
  return (
    <div style={{ width: "100%", height: 300, border: "2px solid purple" }}>
      <Group orientation="horizontal">
        <Panel defaultSize={25}>
          {/* This inner Group needs its OWN sized container */}
          <div style={{ height: "100%", overflow: "hidden" }}>
            <Group orientation="vertical">
              <Panel defaultSize={50}>
                <Box label="TL" bg="bg-orange-100" />
              </Panel>
              <SeparatorV />
              <Panel defaultSize={50}>
                <Box label="BL" bg="bg-rose-100" />
              </Panel>
            </Group>
          </div>
        </Panel>
        <SeparatorH />
        <Panel defaultSize={75}>
          <Box label="RIGHT 75%" bg="bg-emerald-100" />
        </Panel>
      </Group>
    </div>
  );
}

/**
 * Test 5a — BROKEN: calc() height, overflow:hidden, but NO display:flex on parent.
 * Group sets width/height:100% internally but can't resolve % width without flex context.
 */
function Test5Broken() {
  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 500px)",
        border: "3px solid red",
        overflow: "hidden",
        // intentionally no display:flex
      }}
    >
      <Group orientation="horizontal">
        <Panel defaultSize={22} minSize={14} maxSize={40}>
          <div
            style={{
              height: "100%",
              overflow: "hidden",
              background: "#ffd0d0",
            }}
          >
            <p style={{ padding: 8, fontSize: 12 }}>SIDEBAR 22% — BROKEN?</p>
          </div>
        </Panel>
        <SeparatorH />
        <Panel defaultSize={78} minSize={40}>
          <div
            style={{
              height: "100%",
              overflow: "hidden",
              background: "#ffe8d0",
            }}
          >
            <p style={{ padding: 8, fontSize: 12 }}>MAIN 78% — BROKEN?</p>
          </div>
        </Panel>
      </Group>
    </div>
  );
}

/**
 * Test 5b — FIXED per official docs:
 * "fixing this requires setting an explicit height either on the Group itself
 *  or on its parent HTMLElement"
 * Give Group the explicit height directly. No wrapper div needed.
 */
function Test5Fixed() {
  return (
    <Group
      orientation="horizontal"
      style={{ height: "calc(100vh - 500px)", border: "3px solid green" }}
    >
      <Panel defaultSize={22} minSize={14} maxSize={40}>
        <div
          style={{ height: "100%", overflow: "hidden", background: "#e0f0ff" }}
        >
          <p style={{ padding: 8, fontSize: 12 }}>SIDEBAR 22% — FIXED ✓</p>
        </div>
      </Panel>
      <SeparatorH />
      <Panel defaultSize={78} minSize={40}>
        <div
          style={{ height: "100%", overflow: "hidden", background: "#f0ffe0" }}
        >
          <p style={{ padding: 8, fontSize: 12 }}>MAIN 78% — FIXED ✓</p>
        </div>
      </Panel>
    </Group>
  );
}

// Kept for backward compat reference
function Test5() {
  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 500px)",
        border: "2px solid orange",
        overflow: "hidden",
      }}
    >
      <Group orientation="horizontal">
        <Panel defaultSize={22} minSize={14} maxSize={40}>
          <div
            style={{
              height: "100%",
              overflow: "hidden",
              background: "#e0f0ff",
            }}
          >
            <p style={{ padding: 8, fontSize: 12, fontFamily: "monospace" }}>
              SIDEBAR (22%) — original
            </p>
          </div>
        </Panel>
        <SeparatorH />
        <Panel defaultSize={78} minSize={40}>
          <div
            style={{
              height: "100%",
              overflow: "hidden",
              background: "#f0ffe0",
            }}
          >
            <p style={{ padding: 8, fontSize: 12, fontFamily: "monospace" }}>
              MAIN (78%) — original
            </p>
          </div>
        </Panel>
      </Group>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResizableTestPage() {
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 19),
    ]);

  return (
    <div
      className="p-4 space-y-8 overflow-y-auto"
      style={{ fontFamily: "monospace" }}
    >
      <div className="text-lg font-bold">
        react-resizable-panels v4 — Isolated Test Page
      </div>
      <div className="text-xs text-gray-500">
        Each test is fully isolated. If a test works here but breaks in the real
        layout, the issue is the parent sizing context.
      </div>

      <section>
        <div className="text-sm font-semibold mb-2">
          Test 1 — Basic horizontal, explicit px height on parent
        </div>
        <Test1 />
      </section>

      <section>
        <div className="text-sm font-semibold mb-2">
          Test 2 — Horizontal, flex parent (no explicit px height on Group)
        </div>
        <Test2 />
      </section>

      <section>
        <div className="text-sm font-semibold mb-2">
          Test 3 — Vertical split
        </div>
        <Test3 />
      </section>

      <section>
        <div className="text-sm font-semibold mb-2">
          Test 4 — Nested Groups (outer horizontal, inner left panel vertical)
        </div>
        <Test4 />
      </section>

      <section>
        <div className="text-sm font-semibold mb-2 text-red-600">
          Test 5 (original) — Full-height calc() parent, no flex on parent —
          SHOULD BE BROKEN
        </div>
        <Test5 />
      </section>

      <section>
        <div className="text-sm font-semibold mb-2 text-red-600">
          Test 5a — calc() height, NO display:flex on parent — SHOULD BE BROKEN
        </div>
        <Test5Broken />
      </section>

      <section>
        <div className="text-sm font-semibold mb-2 text-green-700">
          Test 5b — calc() height, WITH display:flex + flex:1 on Group — SHOULD
          WORK ✓
        </div>
        <Test5Fixed />
      </section>

      <section>
        <div className="text-sm font-semibold mb-2">
          Interactive Group with layout logging
        </div>
        <div style={{ width: "100%", height: 200, border: "2px solid #999" }}>
          <Group
            orientation="horizontal"
            onLayoutChanged={(layout) =>
              addLog(`layout: ${JSON.stringify(layout)}`)
            }
          >
            <Panel
              id="left"
              defaultSize={30}
              minSize={10}
              onResize={(size) =>
                addLog(`left resize: ${JSON.stringify(size)}`)
              }
            >
              <Box label="LEFT (drag me)" bg="bg-violet-100" />
            </Panel>
            <SeparatorH />
            <Panel id="right" defaultSize={70} minSize={20}>
              <Box label="RIGHT" bg="bg-amber-100" />
            </Panel>
          </Group>
        </div>
        <div className="mt-2 text-xs bg-gray-900 text-green-400 p-2 rounded h-32 overflow-y-auto">
          {log.length === 0
            ? "Drag the handle to see events..."
            : log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </section>
    </div>
  );
}
