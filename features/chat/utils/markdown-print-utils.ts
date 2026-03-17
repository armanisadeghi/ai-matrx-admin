import { removeThinkingContent } from '@/components/matrx/buttons/markdown-copy-utils';

/**
 * Converts markdown to a clean, print-ready HTML document with embedded styles.
 * Opens a new window/tab for browser print/PDF export, preserving all visual fidelity.
 */

function convertMarkdownTablesForPrint(html: string): string {
    const tableRegex = /^(\|.*\|)\s*\n(\|[-\s:|]*\|)\s*\n((?:\|.*\|\s*\n?)*)/gm;

    return html.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
        const headers = headerRow
            .split('|')
            .map((cell: string) => cell.trim())
            .filter((cell: string) => cell !== '');

        const rows = bodyRows
            .trim()
            .split('\n')
            .filter((row: string) => row.trim())
            .map((row: string) =>
                row
                    .split('|')
                    .map((cell: string) => cell.trim())
                    .filter((cell: string) => cell !== '')
            );

        let tableHtml = '<table class="print-table">\n';
        if (headers.length > 0) {
            tableHtml += '<thead><tr>\n';
            headers.forEach((header: string) => {
                tableHtml += `<th>${header}</th>\n`;
            });
            tableHtml += '</tr></thead>\n';
        }
        if (rows.length > 0) {
            tableHtml += '<tbody>\n';
            rows.forEach((row: string[]) => {
                if (row.length > 0) {
                    tableHtml += '<tr>\n';
                    row.forEach((cell: string) => {
                        tableHtml += `<td>${cell}</td>\n`;
                    });
                    tableHtml += '</tr>\n';
                }
            });
            tableHtml += '</tbody>\n';
        }
        tableHtml += '</table>\n';
        return tableHtml;
    });
}

function markdownToPrintBodyHTML(markdown: string): string {
    if (!markdown) return '';

    let html = removeThinkingContent(markdown);

    // Protect table blocks
    const tablePlaceholders: Array<{ placeholder: string; html: string }> = [];
    html = convertMarkdownTablesForPrint(html);

    // Protect fenced code blocks (``` ... ```)
    const codeBlockPlaceholders: Array<{ placeholder: string; html: string }> = [];
    let codeIdx = 0;
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
        const placeholder = `ΩCODEBLOCKΩ${codeIdx}ΩCODEBLOCKΩ`;
        const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
        codeBlockPlaceholders.push({
            placeholder,
            html: `<div class="code-block-wrapper">${langLabel}<pre class="code-block"><code>${escapeHtml(code.trim())}</code></pre></div>`,
        });
        codeIdx++;
        return placeholder;
    });

    // Protect link text so underscores inside URLs don't get italicized
    const linkPlaceholders: Array<{ placeholder: string; html: string }> = [];
    let linkIdx = 0;
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
        const placeholder = `ΩLINKΩ${linkIdx}ΩLINKΩ`;
        linkPlaceholders.push({ placeholder, html: `<a href="${url}">${text}</a>` });
        linkIdx++;
        return placeholder;
    });

    // Headings
    html = html
        .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^[-*_]{3,}$/gm, '<hr>');

    // Bold / italic
    html = html
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_([^_\s][^_]*)_/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Lists — process line by line
    const lines = html.split('\n');
    const result: string[] = [];
    let inUl = false;
    let inOl = false;

    for (const line of lines) {
        const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
        const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);

        if (ulMatch) {
            if (inOl) { result.push('</ol>'); inOl = false; }
            if (!inUl) { result.push('<ul>'); inUl = true; }
            result.push(`<li>${ulMatch[2]}</li>`);
        } else if (olMatch) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (!inOl) { result.push('<ol>'); inOl = true; }
            result.push(`<li>${olMatch[2]}</li>`);
        } else {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (inOl) { result.push('</ol>'); inOl = false; }
            result.push(line);
        }
    }
    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');
    html = result.join('\n');

    // Wrap bare paragraphs (lines not starting with a block-level tag)
    html = html
        .split('\n')
        .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|table|thead|tbody|tr|th|td|div|ΩCODE)/.test(trimmed)) {
                return line;
            }
            return `<p>${trimmed}</p>`;
        })
        .join('\n');

    // Restore code blocks
    codeBlockPlaceholders.forEach(({ placeholder, html: ph }) => {
        html = html.replace(placeholder, ph);
        // Also unwrap if wrapped in <p>
        html = html.replace(`<p>${placeholder}</p>`, ph);
    });

    // Restore links
    linkPlaceholders.forEach(({ placeholder, html: ph }) => {
        html = html.replace(placeholder, ph);
    });

    return html;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildPrintDocument(bodyHtml: string, title = 'AI Response'): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    /* ── Reset & Base ─────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.7;
      color: #1a1a1a;
      background: #ffffff;
      max-width: 780px;
      margin: 0 auto;
      padding: 32px 40px;
    }

    /* ── Print Button (hidden when printing) ─────── */
    .print-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: pointer;
      border: none;
      font-weight: 600;
      transition: opacity 0.15s;
    }
    .print-btn:hover { opacity: 0.85; }
    .print-btn-primary { background: #2563eb; color: #fff; }
    .print-btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }

    /* ── Typography ───────────────────────────────── */
    h1, h2, h3, h4, h5, h6 {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      font-weight: 700;
      line-height: 1.3;
      color: #111827;
      margin-top: 1.6em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    h1 { font-size: 24pt; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; margin-top: 0; }
    h2 { font-size: 18pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.2em; }
    h3 { font-size: 14pt; }
    h4 { font-size: 12pt; }
    h5, h6 { font-size: 11pt; }

    p {
      margin-bottom: 0.9em;
      orphans: 3;
      widows: 3;
    }

    /* ── Links ────────────────────────────────────── */
    a {
      color: #2563eb;
      text-decoration: underline;
      word-break: break-word;
    }

    /* ── Lists ────────────────────────────────────── */
    ul, ol {
      margin: 0.6em 0 0.9em 0;
      padding-left: 1.8em;
    }
    li {
      margin-bottom: 0.3em;
      page-break-inside: avoid;
    }
    li > ul, li > ol { margin-top: 0.2em; margin-bottom: 0.2em; }

    /* ── Blockquotes ──────────────────────────────── */
    blockquote {
      margin: 1em 0;
      padding: 0.7em 1em 0.7em 1.2em;
      border-left: 4px solid #6366f1;
      background: #f5f3ff;
      border-radius: 0 6px 6px 0;
      color: #374151;
      font-style: italic;
      page-break-inside: avoid;
    }

    /* ── Code ─────────────────────────────────────── */
    .inline-code {
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'Monaco', monospace;
      font-size: 9.5pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .code-block-wrapper {
      position: relative;
      margin: 1em 0 1.2em 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }

    .code-lang {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9pt;
      font-weight: 600;
      color: #64748b;
      background: #f8fafc;
      padding: 4px 12px;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .code-block {
      margin: 0;
      padding: 14px 16px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'Monaco', monospace;
      font-size: 9pt;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre;
      tab-size: 2;
    }

    /* ── Tables ───────────────────────────────────── */
    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0 1.2em 0;
      font-size: 10pt;
      page-break-inside: avoid;
    }

    .print-table th {
      background: #1e293b;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 600;
      font-size: 9.5pt;
      text-align: left;
      padding: 8px 12px;
      border: 1px solid #334155;
    }

    .print-table td {
      padding: 7px 12px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }

    .print-table tr:nth-child(even) td { background: #f8fafc; }
    .print-table tr:hover td { background: #eff6ff; }

    /* ── Horizontal Rule ──────────────────────────── */
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 1.5em 0;
    }

    /* ── Print Media ──────────────────────────────── */
    @media print {
      body {
        max-width: 100%;
        padding: 0;
        font-size: 10.5pt;
      }
      .print-actions { display: none !important; }
      .code-block { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-table th { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      blockquote { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      a[href]::after { content: " (" attr(href) ")"; font-size: 9pt; color: #64748b; }
      a[href^="#"]::after, a[href^="javascript:"]::after { content: ""; }
      h1, h2, h3 { page-break-after: avoid; }
      pre, blockquote, table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn print-btn-primary" onclick="window.print()">
      &#x1F5A8; Print / Save as PDF
    </button>
    <button class="print-btn print-btn-secondary" onclick="window.close()">
      ✕ Close
    </button>
  </div>

  <div class="content">
    ${bodyHtml}
  </div>

  <script>
    // Auto-trigger print dialog after a short delay for smooth UX
    // Uncomment the line below to auto-print on open:
    // setTimeout(() => window.print(), 400);
  </script>
</body>
</html>`;
}

/**
 * Opens a new browser window with a beautifully formatted, print-ready version
 * of the provided markdown content. Users can print directly or save as PDF.
 *
 * @param markdown - Raw markdown string (may contain thinking blocks — they are stripped)
 * @param title    - Document title shown in the browser tab and print header
 */
export function printMarkdownContent(markdown: string, title = 'AI Response'): void {
    const bodyHtml = markdownToPrintBodyHTML(markdown);
    const fullDoc = buildPrintDocument(bodyHtml, title);

    const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!printWindow) {
        // Fallback: download as HTML file if pop-up was blocked
        const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    printWindow.document.open();
    printWindow.document.write(fullDoc);
    printWindow.document.close();
}
