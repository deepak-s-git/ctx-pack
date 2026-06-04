import pc from "picocolors";
import type { FormatResult } from "./formatter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number with thousands separators. */
function fmtNum(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "∞";
}

/** Right-pad a string to `width` characters. */
function padEnd(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

/** Left-pad a string to `width` characters. */
function padStart(str: string, width: number): string {
  return " ".repeat(Math.max(0, width - str.length)) + str;
}

/** Render a tiny bar chart segment. */
function bar(fraction: number, width = 20): string {
  const filled = Math.round(fraction * width);
  const empty = width - filled;
  return pc.green("█".repeat(filled)) + pc.dim("░".repeat(empty));
}

// ---------------------------------------------------------------------------
// Budget usage color
// ---------------------------------------------------------------------------

function budgetColor(used: number, budget: number): (s: string) => string {
  if (!Number.isFinite(budget)) return pc.dim;
  const ratio = used / budget;
  if (ratio > 0.9) return pc.red;
  if (ratio > 0.7) return pc.yellow;
  return pc.green;
}

// ---------------------------------------------------------------------------
// printStats  –  the marketing-screenshot-worthy table
// ---------------------------------------------------------------------------

/**
 * Render a beautiful per-file token breakdown table to stderr.
 *
 * Output goes to stderr so it doesn't interfere with the context output
 * on stdout (important when piping: `ctx-pack auth | pbcopy`).
 */
export function printStats(result: FormatResult): void {
  const { fileStats, totalTokens, budget, fileCount } = result;

  // Column widths — compute dynamically from data.
  const maxFileLen = Math.max(4, ...fileStats.map((f) => f.relative.length));
  const maxTokenLen = Math.max(
    6,
    ...fileStats.map((f) => fmtNum(f.tokens).length),
  );

  const divider = pc.dim("─".repeat(maxFileLen + maxTokenLen + 34));

  // Header
  console.error("");
  console.error(pc.bold(pc.cyan("  📊 Token Breakdown")));
  console.error(divider);
  console.error(
    pc.dim("  ") +
      padEnd(pc.bold("File"), maxFileLen) +
      "  " +
      padStart(pc.bold("Tokens"), maxTokenLen) +
      "  " +
      padStart(pc.bold("%"), 6) +
      "  " +
      pc.bold("Distribution"),
  );
  console.error(divider);

  // Rows
  for (const stat of fileStats) {
    const pct = totalTokens > 0 ? stat.tokens / totalTokens : 0;
    const pctStr = (pct * 100).toFixed(1) + "%";

    console.error(
      "  " +
        padEnd(stat.relative, maxFileLen) +
        "  " +
        padStart(pc.yellow(fmtNum(stat.tokens)), maxTokenLen) +
        "  " +
        padStart(pc.dim(pctStr), 6) +
        "  " +
        bar(pct),
    );
  }

  // Footer
  console.error(divider);

  const colorFn = budgetColor(totalTokens, budget);
  const usageStr = `${fmtNum(totalTokens)} / ${fmtNum(budget)} tokens`;

  console.error(
    "  " +
      padEnd(pc.bold(`${fileCount} files`), maxFileLen) +
      "  " +
      padStart(pc.bold(pc.yellow(fmtNum(totalTokens))), maxTokenLen) +
      "  " +
      padStart(pc.dim("100%"), 6) +
      "  " +
      colorFn(usageStr),
  );
  console.error("");
}

// ---------------------------------------------------------------------------
// printDryRun
// ---------------------------------------------------------------------------

/**
 * Show which files would be included without producing any context output.
 */
export function printDryRun(result: FormatResult): void {
  const { fileStats, totalTokens, budget, fileCount } = result;

  console.error("");
  console.error(pc.bold(pc.cyan("  🔍 Dry Run")));
  console.error(pc.dim("  No output produced — showing file list only.\n"));

  for (const stat of fileStats) {
    console.error(
      "  " + pc.dim("•") + " " + stat.relative + pc.dim(` (${fmtNum(stat.tokens)} tokens)`),
    );
  }

  const colorFn = budgetColor(totalTokens, budget);

  console.error("");
  console.error(
    "  " +
      pc.bold(`${fileCount} files`) +
      " — " +
      colorFn(`${fmtNum(totalTokens)} / ${fmtNum(budget)} tokens`),
  );
  console.error("");
}
