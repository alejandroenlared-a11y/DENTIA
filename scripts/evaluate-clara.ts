import { resolve } from "node:path";
import { evaluateClaraConversations } from "../src/lib/agent/clara-evaluation";
import { loadFixtures, printReport, writeMarkdownReport, writeJsonReport } from "./lib/clara-report";

const fixtureDir = resolve(process.cwd(), "tests/fixtures");
const reportPath = resolve(process.cwd(), "reports/clara-evaluation.md");
const jsonReportPath = resolve(process.cwd(), "reports/clara-evaluation.json");
const fixtures = loadFixtures(fixtureDir);
const result = evaluateClaraConversations(fixtures);

printReport(result);
writeMarkdownReport(result, reportPath);
writeJsonReport(result, jsonReportPath);
console.log("");
console.log(`Markdown report: ${reportPath}`);
console.log(`JSON report: ${jsonReportPath}`);

if (result.score < 95 || result.criticalFailures > 0 || result.conversations.some(conversation => conversation.failed.length > 0)) {
  process.exitCode = 1;
}
