#!/usr/bin/env node

import ora from "ora";
import {
  isGitRepo,
  getDiffHead,
  getDiffCached,
  getLog,
  getUntrackedFiles,
  parseDiff,
  detectNewDeps,
  scanSecurity,
} from "./git.js";
import { summarize } from "./analyze.js";
import { displayReport, displayNoChanges } from "./display.js";
import { saveMarkdownReport } from "./markdown.js";

const noAi = process.argv.includes("--no-ai");
const wantMd = process.argv.includes("--md");

async function main(): Promise<void> {
  const cwd = process.cwd();

  if (!(await isGitRepo(cwd))) {
    console.error("Error: not a git repository. Run whatdiditdo inside a git repo.");
    process.exit(1);
  }

  const spinner = ora("Gathering changes...").start();

  const [diffHead, diffCached, log, untracked] = await Promise.all([
    getDiffHead(cwd),
    getDiffCached(cwd),
    getLog(cwd),
    getUntrackedFiles(cwd),
  ]);

  // Combine diffs (prefer HEAD diff which includes both staged+unstaged when HEAD exists)
  const combinedDiff = diffHead || diffCached;
  const parsedFiles = parseDiff(combinedDiff);

  if (parsedFiles.length === 0 && untracked.length === 0) {
    spinner.stop();
    displayNoChanges();
    return;
  }

  const totalAdded = parsedFiles.reduce((s, f) => s + f.added, 0);
  const totalRemoved = parsedFiles.reduce((s, f) => s + f.removed, 0);
  const newDeps = detectNewDeps(parsedFiles);
  const securityFlags = scanSecurity(parsedFiles);

  let summary: string | null = null;
  if (!noAi && combinedDiff) {
    spinner.text = "Asking Claude for a summary...";
    summary = await summarize(combinedDiff, log);
  }

  spinner.stop();

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

  displayReport(reportData);

  if (wantMd) {
    const outPath = await saveMarkdownReport(reportData, cwd);
    console.log(`Report saved to ./${outPath.split("/").pop()}`);
  }
}

main().catch((err: Error) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
