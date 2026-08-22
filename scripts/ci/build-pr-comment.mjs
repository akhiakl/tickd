#!/usr/bin/env node
/**
 * Builds the Markdown PR comment body from three independent result files:
 *   - Vitest JSON results + coverage-summary.json (unit tests)
 *   - Playwright JSON report for the "e2e" project
 *   - Playwright JSON report for the "a11y" project
 *
 * Any input that's missing (a job failed before producing it, or didn't
 * run) is rendered as its own "did not run" row rather than crashing, so a
 * partial CI run still produces a readable comment.
 *
 * Usage: node scripts/ci/build-pr-comment.mjs > comment.md
 * Reads paths from env vars (see the `paths` object below), all optional.
 */
import { readFileSync } from "node:fs";

const paths = {
  vitestResults: process.env.VITEST_RESULTS_PATH ?? "vitest-results.json",
  coverageSummary: process.env.COVERAGE_SUMMARY_PATH ?? "coverage/coverage-summary.json",
  e2eResults: process.env.E2E_RESULTS_PATH ?? "e2e-results.json",
  a11yResults: process.env.A11Y_RESULTS_PATH ?? "a11y-results.json",
};

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

const mark = (ok) => (ok ? "✅" : "❌");
const basename = (path) => path.split("/").pop();

/** Vitest JSON: one entry per test file, each with its own assertionResults. */
function summarizeVitest(json) {
  if (!json) return null;
  const rows = json.testResults.map((file) => {
    const total = file.assertionResults.length;
    const passed = file.assertionResults.filter((t) => t.status === "passed").length;
    return { name: basename(file.name), passed, total, ok: passed === total && total > 0 };
  });
  return { rows, ok: json.numFailedTests === 0 && json.numTotalTests > 0 };
}

function summarizeCoverage(json) {
  if (!json?.total) return null;
  const t = json.total;
  return {
    statements: t.statements.pct,
    branches: t.branches.pct,
    functions: t.functions.pct,
    lines: t.lines.pct,
  };
}

/** Playwright JSON: a nested suite tree; flatten to per-top-level-file pass/fail counts. */
function summarizePlaywright(json) {
  if (!json) return null;
  const perFile = new Map();

  function visitSpec(fileTitle, spec) {
    const bucket = perFile.get(fileTitle) ?? { passed: 0, total: 0 };
    bucket.total += 1;
    if (spec.ok) bucket.passed += 1;
    perFile.set(fileTitle, bucket);
  }

  function visitSuite(suite, fileTitle) {
    const title = fileTitle ?? suite.title;
    for (const spec of suite.specs ?? []) visitSpec(title, spec);
    for (const child of suite.suites ?? []) visitSuite(child, title);
  }

  for (const suite of json.suites ?? []) visitSuite(suite, null);

  const rows = [...perFile.entries()].map(([name, { passed, total }]) => ({
    name,
    passed,
    total,
    ok: passed === total && total > 0,
  }));
  const ok = (json.stats?.unexpected ?? 0) === 0 && (json.stats?.expected ?? 0) > 0;
  return { rows, ok, stats: json.stats };
}

function renderTestTable(title, summary, extraColumn) {
  const lines = [`### ${title}`, ""];
  if (!summary) {
    lines.push(`_Did not run, or produced no results._ ${mark(false)}`, "");
    return lines.join("\n");
  }
  const header = extraColumn
    ? `| Test file | Passed | ${extraColumn.header} | Status |`
    : `| Test file | Passed | Status |`;
  const divider = extraColumn ? `| --- | --- | --- | --- |` : `| --- | --- | --- |`;
  lines.push(header, divider);
  for (const row of summary.rows) {
    const passedCell = `${row.passed}/${row.total}`;
    const extraCell = extraColumn ? extraColumn.cell(row) : null;
    lines.push(
      extraColumn
        ? `| ${row.name} | ${passedCell} | ${extraCell} | ${mark(row.ok)} |`
        : `| ${row.name} | ${passedCell} | ${mark(row.ok)} |`,
    );
  }
  lines.push("", `**Overall: ${mark(summary.ok)} ${summary.ok ? "Passed" : "Failed"}**`, "");
  return lines.join("\n");
}

function renderCoverage(coverage) {
  if (!coverage) return "_No coverage data._";
  return [
    "| Metric | Coverage |",
    "| --- | --- |",
    `| Statements | ${coverage.statements}% |`,
    `| Branches | ${coverage.branches}% |`,
    `| Functions | ${coverage.functions}% |`,
    `| Lines | ${coverage.lines}% |`,
  ].join("\n");
}

const vitestJson = readJson(paths.vitestResults);
const coverageJson = readJson(paths.coverageSummary);
const e2eJson = readJson(paths.e2eResults);
const a11yJson = readJson(paths.a11yResults);

const vitest = summarizeVitest(vitestJson);
const coverage = summarizeCoverage(coverageJson);
const e2e = summarizePlaywright(e2eJson);
const a11y = summarizePlaywright(a11yJson);

const overallOk = [vitest?.ok, e2e?.ok, a11y?.ok].every(Boolean);

const body = [
  "## Quality check results",
  "",
  `**Overall: ${mark(overallOk)} ${overallOk ? "All checks passed" : "Some checks failed"}**`,
  "",
  renderTestTable("Unit tests", vitest),
  "#### Coverage (`src/lib` - the unit-tested logic layer)",
  "",
  renderCoverage(coverage),
  "",
  renderTestTable("End-to-end tests", e2e),
  renderTestTable("Accessibility tests (axe-core)", a11y),
  "<sub>Generated by `.github/workflows/pr-quality.yml`. Re-run the failing job to refresh this comment.</sub>",
].join("\n");

process.stdout.write(body + "\n");
