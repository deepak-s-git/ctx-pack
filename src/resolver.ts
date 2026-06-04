import path from "node:path";
import fg from "fast-glob";
import type { ProfileConfig, CtxPackConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A resolved file with its absolute and display-friendly relative path. */
export interface ResolvedFile {
  /** Absolute path on disk. */
  absolute: string;
  /** Path relative to the project root (used in output headers). */
  relative: string;
}

// ---------------------------------------------------------------------------
// Default exclusions
// ---------------------------------------------------------------------------

/**
 * Hard-coded exclusions that are always applied regardless of user config.
 * These directories should never be packed into AI context.
 */
const ALWAYS_EXCLUDE: readonly string[] = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "coverage/**",
];

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

/**
 * Build the final exclude list for a profile by merging (in order):
 * 1. Hard-coded always-exclude patterns
 * 2. Config-level `defaults.exclude`
 * 3. Profile-level `exclude`
 *
 * Duplicates are removed via Set.
 */
function mergeExcludes(
  profile: ProfileConfig,
  defaults: CtxPackConfig["defaults"],
): string[] {
  const combined = new Set<string>([
    ...ALWAYS_EXCLUDE,
    ...(defaults?.exclude ?? []),
    ...(profile.exclude ?? []),
  ]);
  return [...combined];
}

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

/**
 * Validate that a resolved file path stays within the project root.
 * Prevents directory traversal via malicious glob patterns in user config.
 *
 * @returns `true` if the path is safe, `false` otherwise.
 */
function isInsideRoot(filePath: string, rootDir: string): boolean {
  const resolved = path.resolve(filePath);
  // Enforce trailing separator to prevent partial-match bypasses
  // e.g. /project-evil matching /project
  const boundary = rootDir.endsWith(path.sep) ? rootDir : rootDir + path.sep;
  return resolved.startsWith(boundary) || resolved === rootDir;
}

// ---------------------------------------------------------------------------
// resolveFiles
// ---------------------------------------------------------------------------

/**
 * Resolve the include/exclude globs for a single profile and return a
 * sorted list of matching files.
 *
 * @param profile  - The profile whose globs to resolve.
 * @param config   - The full config (needed for `defaults.exclude`).
 * @param cwd      - Project root directory (defaults to `process.cwd()`).
 * @returns Sorted array of `ResolvedFile` objects.
 */
export async function resolveFiles(
  profile: ProfileConfig,
  config: CtxPackConfig,
  cwd?: string,
): Promise<ResolvedFile[]> {
  const rootDir = path.resolve(cwd ?? process.cwd());

  const ignore = mergeExcludes(profile, config.defaults);

  const matches = await fg(profile.include, {
    cwd: rootDir,
    ignore,
    dot: false,           // skip dotfiles by default
    onlyFiles: true,      // directories are not useful as context
    absolute: true,       // we need absolute paths for safety checks
    followSymbolicLinks: false, // avoid escaping the project tree via symlinks
  });

  // Security: filter out any paths that escaped the project root.
  const safe = matches.filter((abs) => isInsideRoot(abs, rootDir));

  // Sort for deterministic output order.
  safe.sort((a, b) => a.localeCompare(b));

  return safe.map((abs) => ({
    absolute: abs,
    relative: path.relative(rootDir, abs),
  }));
}
