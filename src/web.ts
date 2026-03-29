import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import type { ReportData } from "./display.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDiffSection(diff: string): string {
  if (!diff || !diff.trim()) return "<p class=\"dim\">No diff available.</p>";

  const fileSections = diff.split(/^diff --git /m).filter(Boolean);
  let html = "";

  for (const section of fileSections) {
    const lines = section.split("\n");
    const headerMatch = lines[0].match(/^a\/(.+?) b\/(.+)$/);
    if (!headerMatch) continue;

    const fileName = headerMatch[2] || headerMatch[1];
    const isNew = section.includes("new file mode");
    const isDeleted = section.includes("deleted file mode");

    let badge = "";
    if (isNew) badge = "<span class=\"badge badge-new\">NEW</span>";
    else if (isDeleted) badge = "<span class=\"badge badge-deleted\">DELETED</span>";
    else badge = "<span class=\"badge badge-modified\">MODIFIED</span>";

    let diffLines = "";
    let inHunk = false;
    for (const line of lines) {
      if (line.startsWith("@@")) {
        inHunk = true;
        diffLines += `<div class="diff-hunk">${escapeHtml(line)}</div>\n`;
      } else if (inHunk) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          diffLines += `<div class="diff-add">${escapeHtml(line)}</div>\n`;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          diffLines += `<div class="diff-del">${escapeHtml(line)}</div>\n`;
        } else if (line.startsWith(" ") || line === "") {
          diffLines += `<div class="diff-ctx">${escapeHtml(line || " ")}</div>\n`;
        }
      }
    }

    html += `<details class="file-diff">
      <summary>${badge} <span class="file-name">${escapeHtml(fileName)}</span></summary>
      <div class="diff-content"><pre><code>${diffLines}</code></pre></div>
    </details>\n`;
  }

  return html;
}

export function generateHtmlReport(data: ReportData, diff: string): string {
  const {
    parsedFiles,
    untrackedFiles,
    totalAdded,
    totalRemoved,
    newDeps,
    securityFlags,
    summary,
    noAi,
  } = data;

  const totalFiles = parsedFiles.length + untrackedFiles.length;

  const fileListHtml = parsedFiles
    .map((f) => {
      if (f.isNew) {
        return `<div class="file-entry"><span class="icon-new">&#10010;</span> <span class="text-green">${escapeHtml(f.file)}</span> <span class="dim">(new, ${f.added} lines)</span></div>`;
      } else if (f.isDeleted) {
        return `<div class="file-entry"><span class="icon-del">&#10006;</span> <span class="text-red">${escapeHtml(f.file)}</span> <span class="dim">(deleted)</span></div>`;
      } else {
        return `<div class="file-entry"><span class="icon-mod">&#9998;</span> ${escapeHtml(f.file)} <span class="dim">(<span class="text-green">+${f.added}</span> <span class="text-red">-${f.removed}</span>)</span></div>`;
      }
    })
    .concat(
      untrackedFiles.map(
        (f) =>
          `<div class="file-entry"><span class="icon-new">&#10010;</span> <span class="text-green">${escapeHtml(f)}</span> <span class="dim">(untracked)</span></div>`
      )
    )
    .join("\n");

  const securityHtml =
    securityFlags.length > 0
      ? `<div class="section">
          <h2 class="section-title warning-title">&#9888;&#65039; SECURITY FLAGS</h2>
          ${securityFlags
            .map((f) => {
              const loc = f.line ? `${escapeHtml(f.file)}:${f.line}` : escapeHtml(f.file);
              return `<div class="security-flag"><span class="warn-icon">&#9888;</span> <span class="warn-loc">${loc}</span> &mdash; <span class="warn-msg">${escapeHtml(f.msg)}</span></div>`;
            })
            .join("\n")}
        </div>`
      : "";

  const summaryHtml = !noAi
    ? `<div class="section">
        <h2 class="section-title">WHAT HAPPENED (AI Summary)</h2>
        <p class="summary-text">${summary ? escapeHtml(summary) : "<span class=\"dim\">(could not generate summary)</span>"}</p>
      </div>`
    : "";

  const depsLine =
    newDeps.length > 0
      ? `<div class="stat-row">New deps: <span class="text-cyan">${escapeHtml(newDeps.join(", "))}</span></div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>WHATDIDITDO Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0a0a;
    color: #d4d4d4;
    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
  }
  .header {
    border-bottom: 1px solid #333;
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }
  .header h1 {
    color: #22d3ee;
    font-size: 1.5rem;
    letter-spacing: 0.15em;
  }
  .header .subtitle {
    color: #666;
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }
  .header .stats-bar {
    margin-top: 0.75rem;
    color: #999;
    font-size: 0.85rem;
  }
  .header .stats-bar span { margin-right: 1.5rem; }
  .section {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #1a1a1a;
  }
  .section-title {
    color: #22d3ee;
    font-size: 0.9rem;
    letter-spacing: 0.1em;
    margin-bottom: 0.75rem;
  }
  .warning-title { color: #facc15; }
  .file-entry {
    padding: 0.2rem 0;
    padding-left: 0.5rem;
  }
  .icon-new { color: #4ade80; }
  .icon-del { color: #f87171; }
  .icon-mod { color: #fbbf24; }
  .text-green { color: #4ade80; }
  .text-red { color: #f87171; }
  .text-cyan { color: #22d3ee; }
  .dim { color: #666; }
  .stat-row {
    padding: 0.15rem 0;
    padding-left: 0.5rem;
  }
  .summary-text {
    padding-left: 0.5rem;
    color: #c4c4c4;
    white-space: pre-wrap;
  }
  .security-flag {
    padding: 0.3rem 0.5rem;
    margin-bottom: 0.25rem;
    background: #1c1307;
    border-left: 3px solid #facc15;
    border-radius: 2px;
  }
  .warn-icon { color: #facc15; }
  .warn-loc { color: #fbbf24; font-weight: bold; }
  .warn-msg { color: #fde68a; }

  /* Diff styling */
  .file-diff {
    margin-bottom: 0.5rem;
  }
  .file-diff summary {
    cursor: pointer;
    padding: 0.4rem 0.5rem;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .file-diff summary:hover {
    background: #151515;
  }
  .file-name { color: #d4d4d4; }
  .badge {
    display: inline-block;
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    font-weight: bold;
    letter-spacing: 0.05em;
    vertical-align: middle;
  }
  .badge-new { background: #064e3b; color: #4ade80; }
  .badge-deleted { background: #450a0a; color: #f87171; }
  .badge-modified { background: #1e1b00; color: #fbbf24; }
  .diff-content {
    margin: 0.5rem 0 0.5rem 1rem;
    background: #111;
    border-radius: 4px;
    overflow-x: auto;
  }
  .diff-content pre {
    margin: 0;
    padding: 0.5rem;
    font-size: 0.8rem;
    line-height: 1.5;
  }
  .diff-content code { font-family: inherit; }
  .diff-hunk {
    color: #7dd3fc;
    background: #0c2a3e;
    padding: 0.1rem 0.5rem;
    margin: 0.25rem -0.5rem;
  }
  .diff-add {
    color: #4ade80;
    background: #052e16;
  }
  .diff-del {
    color: #f87171;
    background: #2c0b0e;
  }
  .diff-ctx {
    color: #666;
  }
  .footer {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #333;
    color: #444;
    font-size: 0.75rem;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>WHATDIDITDO</h1>
    <div class="subtitle">your AI session recap</div>
    <div class="stats-bar">
      <span>${totalFiles} file${totalFiles !== 1 ? "s" : ""} changed</span>
      <span class="text-green">+${totalAdded}</span>
      <span class="text-red">-${totalRemoved}</span>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">FILES CHANGED</h2>
    ${fileListHtml}
  </div>

  <div class="section">
    <h2 class="section-title">DIFFS</h2>
    ${renderDiffSection(diff)}
  </div>

  ${summaryHtml}

  ${securityHtml}

  <div class="section">
    <h2 class="section-title">STATS</h2>
    <div class="stat-row">Files changed: <strong>${totalFiles}</strong></div>
    <div class="stat-row">Lines added: <span class="text-green">+${totalAdded}</span></div>
    <div class="stat-row">Lines removed: <span class="text-red">-${totalRemoved}</span></div>
    ${depsLine}
  </div>

  <div class="footer">
    Generated by whatdiditdo &middot; ${new Date().toLocaleString()}
  </div>
</body>
</html>`;
}

export async function openHtmlReport(
  data: ReportData,
  diff: string,
  cwd: string,
): Promise<void> {
  const html = generateHtmlReport(data, diff);
  const filePath = join(tmpdir(), `whatdiditdo-report-${Date.now()}.html`);
  await writeFile(filePath, html, "utf-8");

  const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
  execFile(openCmd, [filePath], (err) => {
    if (err) {
      console.error(`Could not open browser. Report saved to: ${filePath}`);
    }
  });

  console.log(`Report opened in browser: ${filePath}`);
}
