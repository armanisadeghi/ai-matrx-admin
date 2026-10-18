"use client";

// THE "SPOKEN OR TYPED ANSWER" ON A PUBLIC FORM.
//
// records-ui draws every long-text question through its host's `textBox` port. On a public form the
// host lends the platform's one writing box, ProTextarea, with its microphone ON and every agent
// action OFF: the person answering has no account, so the box offers exactly two ways to answer —
// type, or speak. A spoken answer is transcribed under the page's public transcription grant
// (`TranscriptionGrantProvider`, which the runner mounts with the form's id), billed to the
// organization that published the form; typing always works, and a refused clip says why.

import type { RecordsUiHost } from "@ai-matrx/records-ui";
import type { ReactNode } from "react";

import { ProTextarea } from "@/components/official/ProTextarea";

export function publicAnswerTextBox(props: Parameters<NonNullable<RecordsUiHost["textBox"]>>[0]): ReactNode {
  return (
    <ProTextarea
      id={props.id}
      value={props.value}
      rows={props.rows}
      autoFocus={props.autoFocus}
      readOnly={props.readOnly}
      disabled={props.disabled}
      aria-label={props.label}
      auxiliaryControlsLabel={props.label}
      onKeyDown={props.onKeyDown}
      onChange={(e) => props.onChange(e.target.value)}
      enableVoice
      appendTranscript
      enableCleanup={false}
      enableHelpWithThis={false}
      enableCustomAgent={false}
      enableBoundAgents={false}
      enableContextMenu={false}
      data-public-answer-box={props.where}
    />
  );
}
