#!/usr/bin/env node

import ora from "ora";
import { installHook, uninstallHook } from "./hook.js";
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
import { generatePRDescription } from "./pr.js";
import { listChanges, undoFile, undoAll } from "./undo.js";
import { detectAgent, getAgentIcon } from "./blame.js";
import { sendNotification } from "./notify.js";
import { openHtmlReport } from "./web.js";
import chalk from "chalk";

const hookMode = process.argv.includes("--hook");
const unhookMode = process.argv.includes("--unhook");
const noAi = process.argv.includes("--no-ai");
const wantMd = process.argv.includes("--md");
const wantJson = process.argv.includes("--json");
const prMode = process.argv.includes("--pr");
const blameMode = process.argv.includes("--blame-agent");
const webMode = process.argv.includes("--web");

const undoIdx = process.argv.indexOf("--undo");
const undoMode = undoIdx !== -1;
const undoArg = undoMode ? process.argv[undoIdx + 1] ?? null : null;

const lastIdx = process.argv.indexOf("--last");
const lastN = lastIdx !== -1 ? parseInt(process.argv[lastIdx + 1]) || 1 : 0;

const notifyIdx = process.argv.indexOf("--notify");
if (notifyIdx !== -1 && (process.argv[notifyIdx + 1] === undefined || process.argv[notifyIdx + 1].startsWith("--"))) {
  console.error("Usage: whatdiditdo --notify <webhook-url>");
  process.exit(1);
}
const webhookUrl = notifyIdx !== -1 ? process.argv[notifyIdx + 1] : null;

async function handleUndo(cwd: string): Promise<void> {
  const changes = await listChanges(cwd);

  if (changes.length === 0) {
    console.log(chalk.yellow("No changes found to undo."));
    return;
  }

  // --undo all: revert everything
  if (undoArg === "all") {
    const source = changes[0].source;
    if (source === "committed") {
      await undoAll(cwd);
      console.log(chalk.green("Reverted last commit via git revert."));
    } else {
      for (const change of changes) {
        await undoFile(cwd, change.file, "uncommitted");
      }
      console.log(chalk.green(`Restored ${changes.length} file(s) to their last committed state.`));
    }
    return;
  }

  // --undo <number>: revert a specific file
  if (undoArg !== null) {
    const num = parseInt(undoArg);
    if (isNaN(num) || num < 1 || num > changes.length) {
      console.error(chalk.red(`Invalid selection: ${undoArg}. Choose a number between 1 and ${changes.length}.`));
      process.exit(1);
    }
    const target = changes[num - 1];
    await undoFile(cwd, target.file, target.source);
    console.log(chalk.green(`Reverted: ${target.file}`));
    return;
  }

  // --undo (no arg): list changes with numbers
  const statusColors: Record<string, (s: string) => string> = {
    new: chalk.green,
    modified: chalk.yellow,
    deleted: chalk.red,
  };

  console.log();
  console.log(chalk.bold("  Changed files:"));
  console.log();

  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const colorFn = statusColors[c.status] ?? chalk.white;
    const tag = colorFn(`[${c.status}]`);
    console.log(`  ${chalk.bold(String(i + 1).padStart(3))}  ${tag}  ${c.file}`);
    if (c.preview) {
      console.log(`       ${chalk.dim(c.preview)}`);
    }
  }

  console.log();
  console.log(chalk.dim("  Run `whatdiditdo --undo <number>` to revert a specific file, or `whatdiditdo --undo all` to revert everything."));
  console.log();
}

async function main(): Promise<void> {
  const cwd = process.cwd();

  // Handle --hook / --unhook before anything else
  if (hookMode) {
    try {
      installHook(cwd);
      console.log(chalk.green("\u2714") + " Installed whatdiditdo as a post-commit hook.");
      console.log(chalk.dim("  It will run `npx whatdiditdo --no-ai` after every commit."));
    } catch (err: unknown) {
      console.error(chalk.red("Error:"), (err as Error).message);
      process.exit(1);
    }
    return;
  }

  if (unhookMode) {
    try {
      uninstallHook(cwd);
      console.log(chalk.green("\u2714") + " Removed whatdiditdo post-commit hook.");
    } catch (err: unknown) {
      console.error(chalk.red("Error:"), (err as Error).message);
      process.exit(1);
    }
    return;
  }

  if (!(await isGitRepo(cwd))) {
    console.error("Error: not a git repository. Run whatdiditdo inside a git repo.");
    process.exit(1);
  }

  // Handle --undo mode
  if (undoMode) {
    await handleUndo(cwd);
    return;
  }

  const spinner = wantJson ? null : ora("Gathering changes...").start();

  let detectedAgent: string | undefined;
  let agentIcon: string | undefined;
  if (blameMode) {
    detectedAgent = await detectAgent(cwd);
    agentIcon = getAgentIcon(detectedAgent);
  }

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
    combinedDiff = (diffHead + "\n" + diffCached).trim() || "";
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
    ...(blameMode && { detectedAgent, agentIcon }),
  };

  if (prMode) {
    const pr = generatePRDescription(parsedFiles, newDeps, securityFlags, summary);

    if (wantJson) {
      console.log(JSON.stringify({ title: pr.title, body: pr.body }, null, 2));
      return;
    }

    const LINE = "\u2500".repeat(60);
    console.log();
    console.log(chalk.dim(LINE));
    console.log();
    console.log(chalk.bold("  PR TITLE"));
    console.log();
    console.log(`  ${chalk.white(pr.title)}`);
    console.log();
    console.log(chalk.dim(LINE));
    console.log();
    console.log(chalk.bold("  PR BODY"));
    console.log();
    console.log(chalk.gray(pr.body));
    console.log(chalk.dim(LINE));
    console.log();
    console.log(chalk.dim("  Copy the above into your PR. Or pipe: whatdiditdo --pr | pbcopy"));
    console.log();
    return;
  }

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
      ...(blameMode && { detectedAgent }),
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }

  if (webMode) {
    await openHtmlReport(reportData, combinedDiff, cwd);
  } else {
    displayReport(reportData);
    displayEmojiSummary(reportData);
  }

  if (wantMd) {
    const outPath = await saveMarkdownReport(reportData, cwd);
    console.log(`Report saved to ./${outPath.split("/").pop()}`);
  }

  if (webhookUrl) {
    try {
      await sendNotification(webhookUrl, reportData);
      console.log(chalk.green("\u2714") + " Notification sent to webhook.");
    } catch {
      console.warn(chalk.yellow("\u26A0") + " Failed to send webhook notification.");
    }
  }
}

main().catch((err: Error) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
