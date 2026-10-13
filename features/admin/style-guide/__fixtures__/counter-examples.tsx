// DELIBERATELY WRONG UI — the style guide's "Don't" samples (features/admin/style-guide).
// Every mistake here is on purpose and drawn with inline styles; the UI guards skip
// __fixtures__/ so these never count as drift. Never import from this file anywhere else.

import type { CSSProperties } from "react";

const BAD = {
  tiny: { fontSize: 10 } as CSSProperties,
  small: { fontSize: 11 } as CSSProperties,
  grey60: { color: "hsl(var(--muted-foreground) / 0.6)" } as CSSProperties,
  grey40: { color: "hsl(var(--muted-foreground) / 0.4)" } as CSSProperties,
  mono: { fontFamily: "var(--font-mono)", fontSize: 12 } as CSSProperties,
  fill: {
    background: "hsl(var(--muted) / 0.6)",
    borderRadius: 4,
    padding: "2px 6px",
    marginLeft: 20,
  } as CSSProperties,
};

export function BadProvisionRows() {
  return (
    <div className="flex flex-col gap-3">
      {[
        [
          "Website domain",
          "domain",
          "the website typed or confirmed",
          "fullspecstaff.com",
        ],
        [
          "Name searched",
          "brand_name",
          "confirmed name, else the site's own title",
          "Full Spectrum Search Group",
        ],
      ].map(([label, code, hint, value]) => (
        <div key={code} style={{ fontSize: 12 }}>
          <div>
            <span style={{ fontWeight: 500 }}>{label}</span>{" "}
            <span style={BAD.mono}>{code}</span>
          </div>
          <div style={BAD.grey60}>{hint}</div>
          <div style={{ ...BAD.mono, ...BAD.fill, display: "inline-block" }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BadGreys() {
  return (
    <div className="flex flex-col">
      <span style={{ fontSize: 13, fontWeight: 500 }}>Quarterly report</span>
      <span style={{ fontSize: 11 }}>
        <span className="text-muted-foreground">PDF</span> ·{" "}
        <span style={BAD.grey60}>2.4 MB</span> ·{" "}
        <span style={BAD.grey40}>edited 2 min ago</span>
      </span>
    </div>
  );
}

export function BadColours() {
  return (
    <div className="flex flex-wrap gap-3" style={{ fontSize: 11 }}>
      <span style={{ color: "#059669" }}>Complete</span>
      <span
        style={{
          color: "#2563eb",
          background: "#dbeafe",
          borderRadius: 999,
          padding: "0 8px",
        }}
      >
        Running
      </span>
      <span style={{ color: "#d97706", fontWeight: 700 }}>NEEDS REVIEW</span>
      <span style={{ color: "#dc2626", fontStyle: "italic" }}>failed!</span>
    </div>
  );
}

export function BadSurfaces() {
  return (
    <div
      style={{
        border: "1px solid hsl(var(--border))",
        borderRadius: 8,
        padding: 8,
        boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
      }}
    >
      {["Brand brief", "Launch plan"].map((t) => (
        <div
          key={t}
          style={{
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            padding: 8,
            marginTop: 6,
            background: "hsl(var(--muted) / 0.5)",
            boxShadow: "0 1px 3px rgb(0 0 0 / 0.1)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
        </div>
      ))}
    </div>
  );
}

export function BadStates() {
  return (
    <div className="flex flex-col gap-3" style={{ fontSize: 12 }}>
      <div>
        <div>Name confirmed by the person</div>
        <div style={{ ...BAD.grey60, fontStyle: "italic" }}>Missing</div>
      </div>
      <div>
        <div>What the social accounts said</div>
        <div style={BAD.grey60}>Loading…</div>
      </div>
    </div>
  );
}

export function BadProse() {
  return (
    <div className="flex flex-col gap-2" style={{ fontSize: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>No sources yet</div>
      <p style={BAD.grey60}>
        This brand doesn&apos;t have any sources connected right now. Sources
        are the websites, social profiles and listings that our system reads in
        order to learn about the brand. You can add one by clicking the button
        below, and the system will begin reading it right away.
      </p>
    </div>
  );
}
