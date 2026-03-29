import chalk from "chalk";

const LINE = "─".repeat(54);

function header() {
  console.log();
  console.log(chalk.dim(LINE));
  console.log(chalk.bold("  WHATDIDITDO") + chalk.dim("  —  your AI session recap"));
  console.log(chalk.dim(LINE));
}

function section(title) {
  console.log();
  console.log(chalk.dim(LINE));
  console.log();
  console.log(chalk.bold(`  ${title}`));
  console.log();
}

function footer() {
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
}) {
  header();

  // FILES CHANGED
  section("FILES CHANGED");

  for (const f of parsedFiles) {
    if (f.isNew) {
      console.log(
        `  ${chalk.green("✚")} ${chalk.green(f.file)}  ${chalk.dim(`(new, ${f.added} lines)`)}`
      );
    } else if (f.isDeleted) {
      console.log(
        `  ${chalk.red("✖")} ${chalk.red(f.file)}  ${chalk.dim("(deleted)")}`
      );
    } else {
      console.log(
        `  ${chalk.yellow("✎")} ${f.file}  ${chalk.dim(`(${chalk.green("+" + f.added)} ${chalk.red("-" + f.removed)})`)}`
      );
    }
  }

  for (const f of untrackedFiles) {
    console.log(
      `  ${chalk.green("✚")} ${chalk.green(f)}  ${chalk.dim("(untracked)")}`
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
}

export function displayNoChanges() {
  header();
  console.log();
  console.log(chalk.dim("  No changes detected. Your repo is clean!"));
  footer();
}
