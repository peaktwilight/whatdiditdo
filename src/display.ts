import chalk from "chalk";
import type { FileChange, SecurityFlag } from "./git.js";

const LINE = "\u2500".repeat(54);

export interface ReportData {
  parsedFiles: FileChange[];
  untrackedFiles: string[];
  totalAdded: number;
  totalRemoved: number;
  newDeps: string[];
  securityFlags: SecurityFlag[];
  summary: string | null;
  noAi: boolean;
  detectedAgent?: string;
  agentIcon?: string;
}

function header(): void {
  console.log();
  console.log(chalk.dim(LINE));
  console.log(chalk.bold("  WHATDIDITDO") + chalk.dim("  \u2014  your AI session recap"));
  console.log(chalk.dim(LINE));
}

function section(title: string): void {
  console.log();
  console.log(chalk.dim(LINE));
  console.log();
  console.log(chalk.bold(`  ${title}`));
  console.log();
}

function footer(): void {
  console.log();
  console.log(chalk.dim(LINE));
  console.log();
}

export function displayReport({
  parsedFiles,
  untrackedFiles,
  totalAdded,
  totalRemoved,
  newDeps,
  securityFlags,
  summary,
  noAi,
  detectedAgent,
  agentIcon,
}: ReportData): void {
  header();

  // DETECTED AGENT
  if (detectedAgent) {
    section("DETECTED AGENT");
    console.log(`  ${agentIcon ?? "\uD83E\uDD16"}  ${chalk.bold(detectedAgent)}`);
  }

  // FILES CHANGED
  section("FILES CHANGED");

  for (const f of parsedFiles) {
    if (f.isNew) {
      console.log(
        `  ${chalk.green("\u271A")} ${chalk.green(f.file)}  ${chalk.dim(`(new, ${f.added} lines)`)}`
      );
    } else if (f.isDeleted) {
      console.log(
        `  ${chalk.red("\u2716")} ${chalk.red(f.file)}  ${chalk.dim("(deleted)")}`
      );
    } else {
      console.log(
        `  ${chalk.yellow("\u270E")} ${f.file}  ${chalk.dim(`(${chalk.green("+" + f.added)} ${chalk.red("-" + f.removed)})`)}`
      );
    }
  }

  for (const f of untrackedFiles) {
    console.log(
      `  ${chalk.green("\u271A")} ${chalk.green(f)}  ${chalk.dim("(untracked)")}`
    );
  }

  if (parsedFiles.length === 0 && untrackedFiles.length === 0) {
    console.log(chalk.dim("  No file changes detected."));
  }

  // STATS
  section("STATS");

  const totalFiles = parsedFiles.length + untrackedFiles.length;
  console.log(`  Files changed:  ${chalk.bold(totalFiles)}`);
  console.log(`  Lines added:    ${chalk.green("+" + totalAdded)}`);
  console.log(`  Lines removed:  ${chalk.red("-" + totalRemoved)}`);

  if (newDeps.length > 0) {
    console.log(`  New deps:       ${chalk.cyan(newDeps.join(", "))}`);
  }

  // AI SUMMARY
  if (!noAi) {
    section("WHAT HAPPENED (AI Summary)");

    if (summary) {
      const words = summary.split(" ");
      let line = "  ";
      for (const w of words) {
        if (line.length + w.length + 1 > 56) {
          console.log(line);
          line = "  " + w;
        } else {
          line += (line.trim() ? " " : "") + w;
        }
      }
      if (line.trim()) console.log(line);
    } else {
      console.log(chalk.dim("  (could not generate summary)"));
    }
  }

  // SECURITY FLAGS
  if (securityFlags.length > 0) {
    section("\u26A0\uFE0F  SECURITY FLAGS");

    for (const f of securityFlags) {
      const loc = f.line ? `${f.file}:${f.line}` : f.file;
      console.log(`  ${chalk.yellow("\u26A0")}  ${loc} ${chalk.dim("\u2014")} ${chalk.yellow(f.msg)}`);
    }
  }

  footer();

  // QUICK SHARE
  quickShare({ parsedFiles, untrackedFiles, totalAdded, totalRemoved, newDeps, securityFlags });
}

function quickShare({
  parsedFiles,
  untrackedFiles,
  totalAdded,
  totalRemoved,
  newDeps,
  securityFlags,
}: Pick<ReportData, "parsedFiles" | "untrackedFiles" | "totalAdded" | "totalRemoved" | "newDeps" | "securityFlags">): void {
  const totalFiles = parsedFiles.length + untrackedFiles.length;
  const parts: string[] = [
    `${totalFiles} file${totalFiles !== 1 ? "s" : ""} changed (+${totalAdded} -${totalRemoved})`,
  ];

  if (newDeps.length > 0) {
    parts.push(`${newDeps.length} new dep${newDeps.length !== 1 ? "s" : ""} (${newDeps.join(", ")})`);
  }

  if (securityFlags.length > 0) {
    parts.push(`\u26A0\uFE0F ${securityFlags.length} security flag${securityFlags.length !== 1 ? "s" : ""}`);
  }

  const oneLiner = `\uD83E\uDD16 AI session: ${parts.join(" | ")}`;

  console.log(chalk.dim(LINE));
  console.log(chalk.bold("  QUICK SHARE") + chalk.dim("  (copy this)"));
  console.log();
  console.log(`  ${oneLiner}`);
  console.log(chalk.dim(LINE));
  console.log();
}

export function displayEmojiSummary({
  parsedFiles,
  untrackedFiles,
  totalAdded,
  totalRemoved,
  newDeps,
  securityFlags,
}: ReportData): void {
  const totalFiles = parsedFiles.length + untrackedFiles.length;
  const parts: string[] = [
    `\uD83D\uDCCA ${totalFiles} file${totalFiles !== 1 ? "s" : ""}`,
    `+${totalAdded} -${totalRemoved}`,
  ];

  if (newDeps.length > 0) {
    parts.push(`${newDeps.length} new dep${newDeps.length !== 1 ? "s" : ""}`);
  }

  if (securityFlags.length > 0) {
    parts.push(`\u26A0\uFE0F ${securityFlags.length} security flag${securityFlags.length !== 1 ? "s" : ""}`);
  }

  console.log(parts.join(" \u00B7 "));
  console.log();
}

export function displayNoChanges(): void {
  header();
  console.log();
  console.log(chalk.dim("  No changes detected. Your repo is clean!"));
  footer();
}
