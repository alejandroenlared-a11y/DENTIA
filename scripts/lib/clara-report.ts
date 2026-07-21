import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ClaraConversationFixture, ClaraEvaluationResult } from "../../src/lib/agent/clara-evaluation";

export function loadFixtures(dir: string): ClaraConversationFixture[] {
  return readdirSync(dir)
    .filter(file => /^clara-conversations.*\.json$/.test(file))
    .sort((a, b) => a.localeCompare(b))
    .flatMap(file => JSON.parse(readFileSync(resolve(dir, file), "utf8")) as ClaraConversationFixture[]);
}

function byCategory(result: ClaraEvaluationResult) {
  const map = new Map<string, { earned: number; total: number; count: number }>();
  for (const conversation of result.conversations) {
    const current = map.get(conversation.category) ?? { earned: 0, total: 0, count: 0 };
    current.earned += conversation.earned;
    current.total += conversation.total;
    current.count += 1;
    map.set(conversation.category, current);
  }
  return map;
}

export function printReport(result: ClaraEvaluationResult, label = "Clara evaluation") {
  const failed = result.conversations.filter(conversation => conversation.failed.length > 0);
  const categories = byCategory(result);

  console.log(`${label}: ${result.score}/100`);
  console.log(`Points: ${result.earned}/${result.total}`);
  console.log(`Conversations: ${result.conversations.length}`);
  console.log(`Critical failures: ${result.criticalFailures}`);
  console.log("");
  console.log("By category:");
  for (const [category, data] of [...categories.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const score = data.total > 0 ? Math.round((data.earned / data.total) * 100) : 0;
    console.log(`- ${category}: ${score}/100 (${data.count} conversations, ${data.earned}/${data.total})`);
  }

  if (failed.length === 0) {
    console.log("");
    console.log("No failed criteria.");
    return;
  }

  console.log("");
  console.log("Failed criteria:");
  for (const conversation of failed) {
    console.log(`- ${conversation.id} (${conversation.title}): ${conversation.score}/100`);
    for (const failure of conversation.failed) {
      console.log(`  - ${JSON.stringify(failure.criterion)} -> ${failure.evidence}`);
    }
  }
}

export function writeMarkdownReport(result: ClaraEvaluationResult, path: string, title = "Evaluacion automatica de Clara") {
  const failed = result.conversations.filter(conversation => conversation.failed.length > 0);
  const categories = byCategory(result);

  const lines = [
    `# ${title}`,
    "",
    `Fecha: ${new Date().toISOString()}`,
    "",
    "## Resultado",
    "",
    `- Puntuacion: ${result.score}/100`,
    `- Puntos: ${result.earned}/${result.total}`,
    `- Conversaciones: ${result.conversations.length}`,
    `- Fallos criticos: ${result.criticalFailures}`,
    `- Criterios fallidos: ${failed.reduce((sum, conversation) => sum + conversation.failed.length, 0)}`,
    "",
    "## Categorias",
    "",
    "| Categoria | Score | Conversaciones | Puntos |",
    "| --- | ---: | ---: | ---: |"
  ];

  for (const [category, data] of [...categories.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const score = data.total > 0 ? Math.round((data.earned / data.total) * 100) : 0;
    lines.push(`| ${category} | ${score}/100 | ${data.count} | ${data.earned}/${data.total} |`);
  }

  lines.push("", "## Conversaciones", "", "| ID | Categoria | Score | Puntos | Fallos | Criticos |", "| --- | --- | ---: | ---: | ---: | ---: |");

  for (const conversation of result.conversations) {
    lines.push(
      `| ${conversation.id} | ${conversation.category} | ${conversation.score}/100 | ${conversation.earned}/${conversation.total} | ${conversation.failed.length} | ${conversation.criticalFailed.length} |`
    );
  }

  const criticalFailed = result.conversations.filter(conversation => conversation.criticalFailed.length > 0);
  if (criticalFailed.length > 0) {
    lines.push("", "## Fallos criticos", "");
    for (const conversation of criticalFailed) {
      lines.push(`### ${conversation.id}: ${conversation.title}`, "");
      for (const failure of conversation.criticalFailed) {
        lines.push(`- ${JSON.stringify(failure.criterion)} -> ${failure.evidence}`);
      }
      lines.push("");
    }
  }

  if (failed.length > 0) {
    lines.push("", "## Criterios fallidos", "");
    for (const conversation of failed) {
      lines.push(`### ${conversation.id}: ${conversation.title}`, "");
      for (const failure of conversation.failed) {
        lines.push(`- ${JSON.stringify(failure.criterion)} -> ${failure.evidence}`);
      }
      lines.push("");
    }
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join("\n")}\n`);
}

export function writeJsonReport(result: ClaraEvaluationResult, path: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
}
