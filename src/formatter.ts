import fs from "node:fs";
import type { ProfileConfig, CtxPackConfig } from "./config.js";
import type { ResolvedFile } from "./resolver.js";
import { clean } from "./cleaner.js";
import { countTokens } from "./tokenizer.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Token statistics for a single file. */
export interface FileStat {
  relative: string;
  tokens: number;
}

/** Aggregated result returned by `formatProfile`. */
export interface FormatResult {
  /** The fully assembled context string, ready to paste. */
  output: string;
  /** Per-file token breakdown. */
  fileStats: FileStat[];
  /** Total tokens across all included files. */
  totalTokens: number;
  /** The profile's token budget (or Infinity if unset). */
  budget: number;
  /** Number of files included. */
  fileCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Merge profile-level and defaults-level clean options. */
function resolveCleanOptions(
  profile: ProfileConfig,
  defaults: CtxPackConfig["defaults"],
) {
  return {
    stripComments: profile.stripComments ?? defaults?.stripComments ?? false,
    stripBlankLines: profile.stripBlankLines ?? defaults?.stripBlankLines ?? false,
  };
}

/** Resolve the effective token budget for this profile. */
function resolveBudget(
  profile: ProfileConfig,
  defaults: CtxPackConfig["defaults"],
): number {
  return profile.maxTokens ?? defaults?.maxTokens ?? Infinity;
}

/** Format a number with thousands separators: 4231 → "4,231". */
function fmtNum(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "∞";
}

// ---------------------------------------------------------------------------
// formatProfile
// ---------------------------------------------------------------------------

/**
 * Read every resolved file, clean its contents, count tokens, and assemble
 * the final context string. Files are added in order until the token budget
 * is exhausted.
 *
 * @param profile  - The active profile configuration.
 * @param config   - The full config (for `defaults`).
 * @param files    - Pre-resolved list of files from `resolveFiles()`.
 * @returns A `FormatResult` with the output string and stats.
 */
export function formatProfile(
  profile: ProfileConfig,
  config: CtxPackConfig,
  files: ResolvedFile[],
): FormatResult {
  const cleanOpts = resolveCleanOptions(profile, config.defaults);
  const budget = resolveBudget(profile, config.defaults);

  const header = profile.header ?? "CONTEXT";

  const fileStats: FileStat[] = [];
  const blocks: string[] = [];
  let totalTokens = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file.absolute, "utf-8");
    const cleaned = clean(raw, cleanOpts);
    const tokens = countTokens(cleaned);

    // Respect the token budget — stop adding files once we'd exceed it.
    if (Number.isFinite(budget) && totalTokens + tokens > budget) {
      continue;
    }

    totalTokens += tokens;
    fileStats.push({ relative: file.relative, tokens });
    blocks.push(`--- ${file.relative} ---\n${cleaned}`);
  }

  // Assemble the final output.
  const headerLine = `=== ${header} ===`;
  const metaLine = `[Token budget: ${fmtNum(budget)} | Files: ${fileStats.length} | Used: ${fmtNum(totalTokens)} tokens]`;

  const output = [headerLine, metaLine, "", ...blocks].join("\n");

  return {
    output,
    fileStats,
    totalTokens,
    budget,
    fileCount: fileStats.length,
  };
}
