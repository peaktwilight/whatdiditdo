import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function run(cmd: string, args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } catch (err: unknown) {
    const e = err as { stdout?: string };
    if (e.stdout !== undefined) return e.stdout;
    throw err;
  }
}

export interface UndoableChange {
  file: string;
  status: "new" | "modified" | "deleted";
  preview: string;
  source: "committed" | "uncommitted";
}

/**
 * List files changed in the working tree (uncommitted) or the last commit,
 * each annotated with status and a short preview.
 */
export async function listChanges(cwd: string): Promise<UndoableChange[]> {
  const changes: UndoableChange[] = [];

  // 1. Check for uncommitted changes first
  const uncommittedRaw = await run(
    "git",
    ["diff", "--name-status", "HEAD"],
    cwd,
  );

  if (uncommittedRaw.trim()) {
    for (const line of uncommittedRaw.trim().split("\n")) {
      if (!line) continue;
      const [code, ...rest] = line.split("\t");
      const file = rest.join("\t");
      if (!file) continue;

      const status = statusFromCode(code);
      const preview = await getPreview(cwd, file, false);
      changes.push({ file, status, preview, source: "uncommitted" });
    }
  }

  if (changes.length > 0) return changes;

  // 2. Fall back to last commit
  const committedRaw = await run(
    "git",
    ["diff", "--name-status", "HEAD~1", "HEAD"],
    cwd,
  );

  for (const line of committedRaw.trim().split("\n")) {
    if (!line) continue;
    const [code, ...rest] = line.split("\t");
    const file = rest.join("\t");
    if (!file) continue;

    const status = statusFromCode(code);
    const preview = await getPreview(cwd, file, true);
    changes.push({ file, status, preview, source: "committed" });
  }

  return changes;
}

function statusFromCode(code: string): "new" | "modified" | "deleted" {
  const c = code.charAt(0);
  if (c === "A") return "new";
  if (c === "D") return "deleted";
  return "modified";
}

async function getPreview(
  cwd: string,
  file: string,
  committed: boolean,
): Promise<string> {
  try {
    const args = committed
      ? ["diff", "HEAD~1", "HEAD", "--stat", "--", file]
      : ["diff", "HEAD", "--stat", "--", file];
    const out = await run("git", args, cwd);
    const lines = out.trim().split("\n");
    return lines[lines.length - 1]?.trim() || "(no diff stats)";
  } catch {
    return "(preview unavailable)";
  }
}

/**
 * Restore a single file to its pre-change state.
 */
export async function undoFile(
  cwd: string,
  file: string,
  source: "committed" | "uncommitted",
): Promise<void> {
  if (source === "uncommitted") {
    await run("git", ["checkout", "--", file], cwd);
  } else {
    await run("git", ["checkout", "HEAD~1", "--", file], cwd);
  }
}

/**
 * Revert the entire last commit.
 */
export async function undoAll(cwd: string): Promise<void> {
  await run("git", ["revert", "HEAD", "--no-edit"], cwd);
}
