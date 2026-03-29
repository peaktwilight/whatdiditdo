import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function run(cmd, args, cwd) {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    if (err.stdout !== undefined) return err.stdout;
    throw err;
  }
}

export async function isGitRepo(cwd) {
  try {
    await run("git", ["rev-parse", "--is-inside-work-tree"], cwd);
    return true;
  } catch {
    return false;
  }
}

export async function getDiffHead(cwd) {
  return run("git", ["diff", "HEAD"], cwd);
}

export async function getDiffCached(cwd) {
  return run("git", ["diff", "--cached"], cwd);
}

export async function getLog(cwd) {
  return run("git", ["log", "--oneline", "-20"], cwd);
}

export async function getDiffStat(cwd) {
  return run("git", ["diff", "HEAD", "--stat"], cwd);
}

export async function getUntrackedFiles(cwd) {
  const out = await run(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    cwd
  );
  return out
    .trim()
    .split("\n")
    .filter((f) => f.length > 0);
}

/**
 * Parse a unified diff string into structured file change info.
 */
export function parseDiff(diffText) {
  const files = [];
  if (!diffText || !diffText.trim()) return files;

  const fileSections = diffText.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const lines = section.split("\n");

    // Extract filenames
    const headerMatch = lines[0].match(/^a\/(.+?) b\/(.+)$/);
    if (!headerMatch) continue;

    const fileA = headerMatch[1];
    const fileB = headerMatch[2];

    const isNew = section.includes("new file mode");
    const isDeleted = section.includes("deleted file mode");

    let added = 0;
    let removed = 0;
    const addedLines = [];

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        added++;
        addedLines.push(line.slice(1));
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        removed++;
      }
    }

    files.push({
      file: fileB || fileA,
      isNew,
      isDeleted,
      added,
      removed,
      addedLines,
    });
  }

  return files;
}

/**
 * Detect new dependencies from package.json changes in the diff.
 */
export function detectNewDeps(parsedFiles) {
  const deps = [];
  const pkgFile = parsedFiles.find((f) => f.file === "package.json");
  if (!pkgFile) return deps;

  for (const line of pkgFile.addedLines) {
    // Match lines like:  "express": "^4.18.0"
    const m = line.match(/^\s*"([^"]+)"\s*:\s*"[\^~]?[\d.]/);
    if (m && m[1] !== "name" && m[1] !== "version" && m[1] !== "description") {
      deps.push(m[1]);
    }
  }
  return deps;
}

/**
 * Scan added lines for potential security issues.
 */
export function scanSecurity(parsedFiles) {
  const flags = [];

  const patterns = [
    {
      regex:
        /(?:api[_-]?key|token|secret|password|passwd|credentials)\s*[:=]\s*["'][A-Za-z0-9_\-/.+]{16,}["']/i,
      msg: "possible hardcoded API key or secret",
    },
    {
      regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
      msg: "private key detected",
    },
    {
      regex: /:\/\/[^@\s]+:[^@\s]+@/,
      msg: "URL with embedded credentials",
    },
  ];

  for (const pf of parsedFiles) {
    // Flag any .env file modification
    if (pf.file.match(/\.env($|\.)/)) {
      flags.push({ file: pf.file, line: null, msg: "check for committed secrets" });
    }

    for (let i = 0; i < pf.addedLines.length; i++) {
      const content = pf.addedLines[i];
      for (const { regex, msg } of patterns) {
        if (regex.test(content)) {
          flags.push({ file: pf.file, line: i + 1, msg });
        }
      }
    }
  }

  return flags;
}
