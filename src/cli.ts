#!/usr/bin/env node

import ora from "ora";
import {
  isGitRepo,
  getDiffHead,
  getDiffCached,
  getLog,
  getLastNDiff,
  getLastNLog,
  getUntrackedFiles,
  parseDiff,
  detectNewDeps,
  scanSecurity,
} from "./git.js";
import { summarize } from "./analyze.js";
import { displayReport, displayNoChanges, displayEmojiSummary } from "./display.js";
import { saveMarkdownReport } from "./markdown.js";

const noAi = process.argv.includes("--no-ai");
const wantMd = process.argv.includes("--md");
const wantJson = process.argv.includes("--json");

const lastIdx = process.argv.indexOf("--last");
const lastN = lastIdx !== -1 ? parseInt(process.argv[lastIdx + 1]) || 1 : 0;

async function main(): Promise<void> {
  const cwd = process.cwd();

  if (!(await isGitRepo(cwd))) {
    console.error("Error: not a git repository. Run whatdiditdo inside a git repo.");
    process.exit(1);
  }

  const spinner = wantJson ? null : ora("Gathering changes...").start();

  let combinedDiff: string;
  let log: string;
  let untracked: string[];

  if (lastN > 0) {
    // --last N mode: show changes from the last N commits
    const [diff, commitLog] = await Promise.all([
      getLastNDiff(cwd, lastN),
      getLastNLog(cwd, lastN),
    ]);
    combinedDiff = diff;
    log = commitLog;
    untracked = [];
  } else {
    const [diffHead, diffCached, recentLog, untrackedFiles] = await Promise.all([
      getDiffHead(cwd),
      getDiffCached(cwd),
      getLog(cwd),
      getUntrackedFiles(cwd),
    ]);
    combinedDiff = diffHead || diffCached;
    log = recentLog;
    untracked = untrackedFiles;
  }

  const parsedFiles = parseDiff(combinedDiff);

  if (parsedFiles.length === 0 && untracked.length === 0) {
    spinner?.stop();
    if (wantJson) {
      console.log(JSON.stringify({ files: [], untracked: [], stats: { totalAdded: 0, totalRemoved: 0 }, newDeps: [], securityFlags: [], summary: null }));
    } else {
      displayNoChanges();
    }
    return;
  }

  const totalAdded = parsedFiles.reduce((s, f) => s + f.added, 0);
  const totalRemoved = parsedFiles.reduce((s, f) => s + f.removed, 0);
  const newDeps = detectNewDeps(parsedFiles);
  const securityFlags = scanSecurity(parsedFiles);

  let summary: string | null = null;
  if (!noAi && combinedDiff) {
    if (spinner) spinner.text = "Asking Claude for a summary...";
    summary = await summarize(combinedDiff, log);
  }

  spinner?.stop();

  const reportData = {
    parsedFiles,
    untrackedFiles: untracked,
    totalAdded,
    totalRemoved,
    newDeps,
    securityFlags,
    summary,
    noAi,
  };

  if (wantJson) {
    const jsonOutput = {
      files: parsedFiles.map((f) => ({
        file: f.file,
        isNew: f.isNew,
        isDeleted: f.isDeleted,
        added: f.added,
        removed: f.removed,
      })),
      untracked: untracked,
      stats: { totalAdded, totalRemoved, totalFiles: parsedFiles.length + untracked.length },
      newDeps,
      securityFlags: securityFlags.map((f) => ({
        file: f.file,
        line: f.line,
        msg: f.msg,
      })),
      summary,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }

  displayReport(reportData);
  displayEmojiSummary(reportData);

  if (wantMd) {
    const outPath = await saveMarkdownReport(reportData, cwd);
    console.log(`Report saved to ./${outPath.split("/").pop()}`);
  }
}

main().catch((err: Error) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
