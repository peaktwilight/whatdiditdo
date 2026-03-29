import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CLAUDE_BIN = "/Users/peak/.local/bin/claude";

/**
 * Send the diff to the claude CLI for a plain-english summary.
 * Returns the summary string or null on failure.
 */
export async function summarize(diff, log) {
  const prompt = `You are reviewing a git diff from an AI coding session. Summarize what changed in 2-4 concise sentences for a developer who wants to quickly understand what the AI did. Focus on the "what" and "why", not line-by-line details. Be direct and specific.

Here is the recent git log for context:
${log || "(no commits yet)"}

Here is the diff:
${diff.slice(0, 80000)}`;

  try {
    const { stdout } = await execFileAsync(
      CLAUDE_BIN,
      ["-p", prompt, "--output-format", "json", "--allowedTools", "Read"],
      {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
      }
    );

    const parsed = JSON.parse(stdout);
    return parsed.result || null;
  } catch (err) {
    return null;
  }
}
