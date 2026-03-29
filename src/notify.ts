import type { ReportData } from "./display.js";

type WebhookType = "slack" | "discord" | "unknown";

function detectWebhookType(url: string): WebhookType {
  if (url.includes("hooks.slack.com")) return "slack";
  if (url.includes("discord.com/api/webhooks")) return "discord";
  return "unknown";
}

function buildPlainSummary(data: ReportData): string {
  const totalFiles = data.parsedFiles.length + data.untrackedFiles.length;
  const lines: string[] = [
    `WHATDIDITDO — AI Session Recap`,
    ``,
    `Files changed: ${totalFiles}`,
    `Lines added: +${data.totalAdded}`,
    `Lines removed: -${data.totalRemoved}`,
  ];

  if (data.newDeps.length > 0) {
    lines.push(`New dependencies: ${data.newDeps.join(", ")}`);
  }

  if (data.securityFlags.length > 0) {
    lines.push(`Security flags: ${data.securityFlags.length}`);
    for (const f of data.securityFlags) {
      const loc = f.line ? `${f.file}:${f.line}` : f.file;
      lines.push(`  ⚠ ${loc} — ${f.msg}`);
    }
  }

  if (data.summary) {
    lines.push(``, `AI Summary:`, data.summary);
  }

  return lines.join("\n");
}

function buildFileList(data: ReportData): string {
  const parts: string[] = [];
  for (const f of data.parsedFiles) {
    if (f.isNew) {
      parts.push(`+ ${f.file} (new, ${f.added} lines)`);
    } else if (f.isDeleted) {
      parts.push(`- ${f.file} (deleted)`);
    } else {
      parts.push(`~ ${f.file} (+${f.added} -${f.removed})`);
    }
  }
  for (const f of data.untrackedFiles) {
    parts.push(`+ ${f} (untracked)`);
  }
  return parts.join("\n");
}

function buildSlackPayload(data: ReportData): object {
  const totalFiles = data.parsedFiles.length + data.untrackedFiles.length;
  const text = buildPlainSummary(data);

  const blocks: object[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "🤖 WHATDIDITDO — AI Session Recap", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Files changed:*\n${totalFiles}` },
        { type: "mrkdwn", text: `*Lines:*\n+${data.totalAdded} / -${data.totalRemoved}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Files:*\n\`\`\`\n${buildFileList(data)}\n\`\`\``,
      },
    },
  ];

  if (data.newDeps.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New dependencies:* ${data.newDeps.map((d) => `\`${d}\``).join(", ")}`,
      },
    });
  }

  if (data.securityFlags.length > 0) {
    const flagLines = data.securityFlags
      .map((f) => {
        const loc = f.line ? `${f.file}:${f.line}` : f.file;
        return `⚠️ \`${loc}\` — ${f.msg}`;
      })
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Security Flags:*\n${flagLines}` },
    });
  }

  if (data.summary) {
    blocks.push(
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*AI Summary:*\n${data.summary}` },
      },
    );
  }

  return { text, blocks };
}

function buildDiscordPayload(data: ReportData): object {
  const totalFiles = data.parsedFiles.length + data.untrackedFiles.length;
  const content = `🤖 **WHATDIDITDO** — AI Session Recap`;

  const fields: object[] = [
    { name: "Files Changed", value: `${totalFiles}`, inline: true },
    { name: "Lines Added", value: `+${data.totalAdded}`, inline: true },
    { name: "Lines Removed", value: `-${data.totalRemoved}`, inline: true },
    { name: "Files", value: `\`\`\`\n${buildFileList(data)}\n\`\`\``, inline: false },
  ];

  if (data.newDeps.length > 0) {
    fields.push({
      name: "New Dependencies",
      value: data.newDeps.map((d) => `\`${d}\``).join(", "),
      inline: false,
    });
  }

  if (data.securityFlags.length > 0) {
    const flagLines = data.securityFlags
      .map((f) => {
        const loc = f.line ? `${f.file}:${f.line}` : f.file;
        return `⚠️ \`${loc}\` — ${f.msg}`;
      })
      .join("\n");
    fields.push({ name: "Security Flags", value: flagLines, inline: false });
  }

  const embeds: object[] = [
    {
      title: "Session Recap",
      color: 0x7c3aed,
      fields,
      ...(data.summary ? { description: `**AI Summary:**\n${data.summary}` } : {}),
      timestamp: new Date().toISOString(),
    },
  ];

  return { content, embeds };
}

export async function sendNotification(webhookUrl: string, data: ReportData): Promise<void> {
  const type = detectWebhookType(webhookUrl);

  let payload: object;
  switch (type) {
    case "slack":
      payload = buildSlackPayload(data);
      break;
    case "discord":
      payload = buildDiscordPayload(data);
      break;
    default:
      payload = { text: buildPlainSummary(data), summary: data.summary ?? "" };
      break;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(
        `Warning: webhook returned ${response.status}${body ? ` — ${body}` : ""}`,
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Warning: failed to send webhook notification — ${msg}`);
  }
}
