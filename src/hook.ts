import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const HOOK_LINE = "npx whatdiditdo --no-ai";
const HOOK_COMMENT = "# Added by whatdiditdo";

export function installHook(cwd: string): void {
  const hooksDir = join(cwd, ".git", "hooks");
  const hookPath = join(hooksDir, "post-commit");

  if (!existsSync(join(cwd, ".git"))) {
    throw new Error("Not a git repository — no .git directory found.");
  }

  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf-8");

    if (existing.includes(HOOK_LINE)) {
      throw new Error("whatdiditdo hook is already installed.");
    }

    // Append to existing hook
    const append = `\n${HOOK_COMMENT}\n${HOOK_LINE}\n`;
    writeFileSync(hookPath, existing.trimEnd() + "\n" + append);
  } else {
    // Create new hook file
    const content = `#!/bin/sh\n${HOOK_COMMENT}\n${HOOK_LINE}\n`;
    writeFileSync(hookPath, content);
  }

  chmodSync(hookPath, 0o755);
}

export function uninstallHook(cwd: string): void {
  const hookPath = join(cwd, ".git", "hooks", "post-commit");

  if (!existsSync(hookPath)) {
    throw new Error("No post-commit hook found.");
  }

  const existing = readFileSync(hookPath, "utf-8");

  if (!existing.includes(HOOK_LINE)) {
    throw new Error("whatdiditdo hook is not installed.");
  }

  // Remove the comment and hook line
  const lines = existing.split("\n").filter(
    (line) => line.trim() !== HOOK_LINE && line.trim() !== HOOK_COMMENT,
  );

  const cleaned = lines.join("\n").trim();

  // If only the shebang remains (or nothing), remove the file entirely
  if (!cleaned || cleaned === "#!/bin/sh") {
    unlinkSync(hookPath);
  } else {
    writeFileSync(hookPath, cleaned + "\n");
    chmodSync(hookPath, 0o755);
  }
}
