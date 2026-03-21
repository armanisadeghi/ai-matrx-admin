import { useState, useRef, useEffect } from "react";
import { SAMPLE_INLINE_DECISIONS } from "./sample-parsed";

const STATIC_PARAGRAPHS = {
  before: `The notes feature must operate fully offline with local MySQL as the single source of truth. Cloud sync is a manually-triggered, optional layer — never a dependency. The following architectural decisions need your input before implementation proceeds.`,
  between_0_1: `The sync mechanism supports three explicit modes: Pull from Server, Push to Server, and Bidirectional. Each mode must handle conflicts deterministically using per-note sync metadata stored locally.`,
  between_1_2: `The local database schema requires additional fields to support sync state tracking: last_synced_at, sync_enabled, and a status flag per note (never_synced, synced, pending_push, excluded).`,
  between_2_3: `Cloud connection errors must be silent failures in any code path that is not explicitly the sync feature — no toasts, no blocking UI, no broken saves. The transcription push-to-note feature should be treated as a standard local note creation.`,
  after: `For any decision where you select "Developer Decision," include your recommendation and reasoning before implementation. Flag any additional ambiguities encountered during the local decoupling fix.`,
};

function InlineDecisionBlock({ decision, onResolve, resolved }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editText, setEditText] = useState("");
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const textareaRef = useRef(null);

  // Always inject a "Custom" option if the model didn't provide one
  const hasCustom = decision.options.some((o) => o.id === "custom");
  const allOptions = hasCustom
    ? decision.options
    : [
        ...decision.options,
        { id: "custom", label: "Custom", text: "" },
      ];

  useEffect(() => {
    if (resolved) {
      setFadeIn(true);
      const t = setTimeout(() => setFadeIn(false), 500);
      return () => clearTimeout(t);
    }
  }, [resolved]);

  useEffect(() => {
    if (selectedId && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      // auto-resize
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [selectedId]);

  if (resolved) {
    return (
      <div className={`resolved-block ${fadeIn ? "fade-in" : ""}`}>
        <p className="resolved-text">{resolved}</p>
      </div>
    );
  }

  const handleSelect = (option) => {
    if (selectedId === option.id) {
      setSelectedId(null);
      setEditText("");
      return;
    }
    setSelectedId(option.id);
    setEditText(option.text);
  };

  const handleApply = () => {
    if (!editText.trim()) return;
    setFadeOut(true);
    setTimeout(() => {
      onResolve(decision.id, editText.trim());
    }, 280);
  };

  const handleCancel = () => {
    setSelectedId(null);
    setEditText("");
  };

  const handleTextareaInput = (e) => {
    setEditText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  return (
    <div className={`decision-block ${expanded ? "expanded" : ""} ${fadeOut ? "fade-out" : ""}`}>
      {/* Collapsed trigger */}
      <button
        className="decision-trigger"
        onClick={() => {
          setExpanded(!expanded);
          if (expanded) {
            setSelectedId(null);
            setEditText("");
          }
        }}
      >
        <div className="trigger-left">
          <span className="pulse-dot" />
          <span className="decision-prompt">{decision.prompt}</span>
        </div>
        <span className="trigger-badge">
          {expanded ? "collapse" : `${allOptions.length} options`}
          <svg
            className={`badge-chevron ${expanded ? "open" : ""}`}
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path
              d="M2.5 3.75L5 6.25L7.5 3.75"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* Expanded: flat option pills + editable text area */}
      {expanded && (
        <div className="options-body">
          <div className="option-pills">
            {allOptions.map((option) => (
              <button
                key={option.id}
                className={`pill ${selectedId === option.id ? "active" : ""} ${option.id === "custom" ? "pill-custom" : ""}`}
                onClick={() => handleSelect(option)}
              >
                {option.id === "custom" && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{marginRight: 4, flexShrink: 0}}>
                    <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  </svg>
                )}
                {option.label}
              </button>
            ))}
          </div>

          {selectedId && (
            <div className="edit-area">
              <textarea
                ref={textareaRef}
                className="edit-textarea"
                value={editText}
                onChange={handleTextareaInput}
                placeholder={selectedId === "custom" ? "Write your own approach..." : "Edit before applying..."}
                rows={2}
              />
              <div className="edit-actions">
                <button className="btn-back" onClick={handleCancel}>
                  Cancel
                </button>
                <button
                  className="btn-apply"
                  onClick={handleApply}
                  disabled={!editText.trim()}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DecisionBlockDemo() {
  const [resolutions, setResolutions] = useState({});
  const [resetKey, setResetKey] = useState(0);

  const resolvedCount = Object.keys(resolutions).length;
  const totalCount = SAMPLE_INLINE_DECISIONS.length;

  const handleResolve = (id, text) => {
    setResolutions((prev) => ({ ...prev, [id]: text }));
  };

  const handleReset = () => {
    setResolutions({});
    setResetKey((k) => k + 1);
  };

  return (
    <div className="demo-root" key={resetKey}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&display=swap');

        .demo-root {
          --bg: #0C0E12;
          --surface: #13161D;
          --surface-hover: #1A1E28;
          --border: #252A37;
          --border-active: #3B7A5C;
          --text-1: #CDD3E0;
          --text-2: #7C859B;
          --text-3: #4A5168;
          --accent: #4ADE80;
          --accent-soft: rgba(74,222,128,0.12);
          --accent-mid: #2E7D50;
          --font-body: 'Source Serif 4', Georgia, serif;
          --font-mono: 'DM Mono', 'SF Mono', monospace;
          --radius: 5px;

          min-height: 100vh;
          background: var(--bg);
          color: var(--text-1);
          font-family: var(--font-body);
          font-size: 15.5px;
          line-height: 1.75;
          padding: 0;
          margin: 0;
          -webkit-font-smoothing: antialiased;
        }

        .doc-container {
          max-width: 700px;
          margin: 0 auto;
          padding: 44px 24px 120px;
        }

        /* --- Header --- */
        .doc-header {
          margin-bottom: 40px;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--border);
        }
        .doc-title {
          font-family: var(--font-body);
          font-size: 26px;
          font-weight: 600;
          color: var(--text-1);
          margin: 0 0 6px;
          letter-spacing: -0.3px;
        }
        .doc-meta {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--text-3);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 18px;
        }
        .progress-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .progress-track {
          flex: 1;
          height: 2px;
          background: var(--border);
          border-radius: 1px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--accent);
          transition: width 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .progress-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-3);
          white-space: nowrap;
        }

        /* --- Prose --- */
        .prose {
          color: var(--text-2);
          margin: 0 0 20px;
        }

        /* --- Decision Block --- */
        .decision-block {
          margin: 6px 0 24px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface);
          transition: border-color 0.2s, box-shadow 0.2s, opacity 0.28s, transform 0.28s;
          overflow: hidden;
        }
        .decision-block.expanded {
          border-color: var(--border-active);
          box-shadow: 0 0 0 1px var(--accent-soft);
        }
        .decision-block.fade-out {
          opacity: 0;
          transform: translateY(-4px) scale(0.99);
        }

        /* --- Trigger --- */
        .decision-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-1);
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          transition: background 0.12s;
        }
        .decision-trigger:hover {
          background: var(--surface-hover);
        }
        .trigger-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        /* Pulsing dot */
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
          position: relative;
          box-shadow: 0 0 6px rgba(74,222,128,0.4);
          animation: pulse 2.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 4px rgba(74,222,128,0.3); transform: scale(1); }
          50% { box-shadow: 0 0 12px rgba(74,222,128,0.6); transform: scale(1.15); }
        }
        .expanded .pulse-dot {
          animation: none;
          box-shadow: 0 0 6px rgba(74,222,128,0.4);
        }

        .decision-prompt {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .trigger-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: var(--text-3);
          white-space: nowrap;
          padding: 3px 8px;
          background: rgba(255,255,255,0.03);
          border-radius: 3px;
          border: 1px solid var(--border);
          flex-shrink: 0;
        }
        .badge-chevron {
          transition: transform 0.2s;
        }
        .badge-chevron.open {
          transform: rotate(180deg);
        }

        /* --- Options body (flat, no extra card layers) --- */
        .options-body {
          padding: 2px 14px 14px;
          animation: slideIn 0.18s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Pills row */
        .option-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 2px;
        }
        .pill {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 400;
          padding: 6px 12px;
          border-radius: 3px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          cursor: pointer;
          transition: all 0.12s;
          display: flex;
          align-items: center;
        }
        .pill:hover {
          border-color: var(--text-3);
          color: var(--text-1);
          background: var(--surface-hover);
        }
        .pill.active {
          border-color: var(--accent-mid);
          background: var(--accent-soft);
          color: var(--accent);
        }
        .pill-custom {
          border-style: dashed;
        }

        /* Editable text area */
        .edit-area {
          margin-top: 10px;
          animation: fadeUp 0.15s ease;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .edit-textarea {
          width: 100%;
          box-sizing: border-box;
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-1);
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 10px 12px;
          resize: none;
          overflow: hidden;
          outline: none;
          transition: border-color 0.15s;
        }
        .edit-textarea:focus {
          border-color: var(--accent-mid);
        }
        .edit-textarea::placeholder {
          color: var(--text-3);
        }
        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
        .btn-back, .btn-apply {
          font-family: var(--font-mono);
          font-size: 11.5px;
          font-weight: 500;
          padding: 5px 14px;
          border-radius: 3px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.12s;
        }
        .btn-back {
          background: none;
          color: var(--text-3);
          border-color: var(--border);
        }
        .btn-back:hover {
          color: var(--text-2);
          border-color: var(--text-3);
        }
        .btn-apply {
          background: var(--accent-mid);
          color: #fff;
        }
        .btn-apply:hover:not(:disabled) {
          background: #378F58;
        }
        .btn-apply:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /* --- Resolved --- */
        .resolved-block {
          margin: 6px 0 24px;
        }
        .resolved-block.fade-in {
          animation: resolveIn 0.45s ease;
        }
        @keyframes resolveIn {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .resolved-text {
          color: var(--text-2);
          margin: 0;
        }

        /* --- Complete --- */
        .complete-banner {
          margin: 28px 0;
          padding: 14px 18px;
          background: rgba(74,222,128,0.06);
          border: 1px solid var(--accent-mid);
          border-radius: var(--radius);
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--accent);
          text-align: center;
          animation: fadeUp 0.35s ease;
        }

        /* --- Reset --- */
        .reset-area {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }
        .reset-btn {
          font-family: var(--font-mono);
          font-size: 11px;
          padding: 7px 18px;
          background: var(--surface);
          color: var(--text-3);
          border: 1px solid var(--border);
          border-radius: 16px;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.12s;
        }
        .reset-btn:hover {
          color: var(--text-2);
          border-color: var(--text-3);
        }
      `}</style>

      <div className="doc-container">
        <header className="doc-header">
          <h1 className="doc-title">Notes System — Architecture Decisions</h1>
          <p className="doc-meta">Interactive Specification</p>
          <div className="progress-row">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${(resolvedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="progress-label">
              {resolvedCount}/{totalCount} resolved
            </span>
          </div>
        </header>

        <p className="prose">{STATIC_PARAGRAPHS.before}</p>

        <InlineDecisionBlock
          decision={SAMPLE_INLINE_DECISIONS[0]}
          onResolve={handleResolve}
          resolved={resolutions[SAMPLE_INLINE_DECISIONS[0].id]}
        />

        <p className="prose">{STATIC_PARAGRAPHS.between_0_1}</p>

        <InlineDecisionBlock
          decision={SAMPLE_INLINE_DECISIONS[1]}
          onResolve={handleResolve}
          resolved={resolutions[SAMPLE_INLINE_DECISIONS[1].id]}
        />

        <p className="prose">{STATIC_PARAGRAPHS.between_1_2}</p>

        <InlineDecisionBlock
          decision={SAMPLE_INLINE_DECISIONS[2]}
          onResolve={handleResolve}
          resolved={resolutions[SAMPLE_INLINE_DECISIONS[2].id]}
        />

        <p className="prose">{STATIC_PARAGRAPHS.between_2_3}</p>

        <InlineDecisionBlock
          decision={SAMPLE_INLINE_DECISIONS[3]}
          onResolve={handleResolve}
          resolved={resolutions[SAMPLE_INLINE_DECISIONS[3].id]}
        />

        <p className="prose">{STATIC_PARAGRAPHS.after}</p>

        {resolvedCount === totalCount && (
          <div className="complete-banner">
            All decisions resolved — document finalized
          </div>
        )}
      </div>

      {resolvedCount > 0 && (
        <div className="reset-area">
          <button className="reset-btn" onClick={handleReset}>
            Reset all decisions
          </button>
        </div>
      )}
    </div>
  );
}
