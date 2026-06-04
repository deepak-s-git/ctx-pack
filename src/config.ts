import { createJiti } from "jiti";
import path from "node:path";
import fs from "node:fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-profile configuration. */
export interface ProfileConfig {
  /** Glob patterns for files to include. */
  include: string[];
  /** Glob patterns for files to exclude. */
  exclude?: string[];
  /** Maximum token budget for this profile's output. */
  maxTokens?: number;
  /** Strip single-line and multi-line comments from file contents. */
  stripComments?: boolean;
  /** Remove consecutive blank lines from file contents. */
  stripBlankLines?: boolean;
  /** Header text rendered at the top of the output block. */
  header?: string;
}

/** Top-level ctx-pack configuration returned by `defineConfig()`. */
export interface CtxPackConfig {
  /** Named context profiles. */
  profiles: Record<string, ProfileConfig>;
  /** Default values merged into every profile. */
  defaults?: {
    exclude?: string[];
    maxTokens?: number;
    stripComments?: boolean;
    stripBlankLines?: boolean;
  };
}

// ---------------------------------------------------------------------------
// defineConfig  –  identity helper for typesafe config authoring
// ---------------------------------------------------------------------------

/**
 * Identity function that provides type-checking and autocomplete for
 * `ctx.config.ts` files.
 *
 * @example
 * ```ts
 * import { defineConfig } from "ctx-pack";
 *
 * export default defineConfig({
 *   profiles: {
 *     auth: { include: ["src/auth/**"] },
 *   },
 * });
 * ```
 */
export function defineConfig(config: CtxPackConfig): CtxPackConfig {
  return config;
}

// ---------------------------------------------------------------------------
// Config file discovery
// ---------------------------------------------------------------------------

/** Supported config file names in priority order. */
const CONFIG_FILE_NAMES = [
  "ctx.config.ts",
  "ctx.config.js",
  "ctx.config.mjs",
  "ctx.config.cjs",
] as const;

/**
 * Walk up from `startDir` looking for a config file.
 * Returns the absolute path of the first match, or `undefined`.
 */
function findConfigFile(startDir: string): string | undefined {
  let dir = path.resolve(startDir);

  // Safety: cap the upward walk to avoid infinite loops on unusual filesystems.
  const MAX_DEPTH = 64;
  for (let i = 0; i < MAX_DEPTH; i++) {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      // Reached filesystem root — nothing found.
      return undefined;
    }
    dir = parent;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// loadConfig  –  runtime config loading via jiti v2
// ---------------------------------------------------------------------------

/**
 * Locate and load the user's `ctx.config.ts` (or `.js` / `.mjs` / `.cjs`).
 *
 * @param cwd - Directory to start the config search from (defaults to `process.cwd()`).
 * @returns The validated `CtxPackConfig`.
 * @throws If no config file is found or the config is structurally invalid.
 */
export async function loadConfig(cwd?: string): Promise<CtxPackConfig> {
  const startDir = cwd ?? process.cwd();

  const configPath = findConfigFile(startDir);
  if (!configPath) {
    throw new Error(
      "No ctx-pack config file found.\n" +
        "Create a ctx.config.ts in your project root, or run `npx ctx-pack init`.",
    );
  }

  // TODO(security): The config file is loaded and executed at runtime.
  // This is intentional — it's the user's own project config, analogous to
  // how ESLint, Vite, and similar tools load config. We trust the local
  // filesystem here since the tool is fully offline with no network calls.

  const jiti = createJiti(import.meta.url, {
    // Disable filesystem cache to always pick up the latest config edits.
    fsCache: false,
  });

  const mod: unknown = await jiti.import(configPath, { default: true });

  return validateConfig(mod, configPath);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Perform lightweight structural validation on the loaded config object.
 * Throws descriptive errors so users can fix their config quickly.
 */
function validateConfig(raw: unknown, configPath: string): CtxPackConfig {
  if (raw == null || typeof raw !== "object") {
    throw new Error(
      `Config file does not export a valid object: ${configPath}\n` +
        "Make sure you use `export default defineConfig({ ... })` in your config.",
    );
  }

  const config = raw as Record<string, unknown>;

  if (!config["profiles"] || typeof config["profiles"] !== "object") {
    throw new Error(
      `Config is missing a "profiles" object: ${configPath}\n` +
        "At least one named profile must be defined.",
    );
  }

  const profiles = config["profiles"] as Record<string, unknown>;

  for (const [name, profile] of Object.entries(profiles)) {
    if (profile == null || typeof profile !== "object") {
      throw new Error(
        `Profile "${name}" must be an object in ${configPath}.`,
      );
    }

    const p = profile as Record<string, unknown>;

    if (!Array.isArray(p["include"]) || p["include"].length === 0) {
      throw new Error(
        `Profile "${name}" must have a non-empty "include" array in ${configPath}.`,
      );
    }

    // Validate that include items are strings.
    for (const item of p["include"]) {
      if (typeof item !== "string") {
        throw new Error(
          `Profile "${name}": every entry in "include" must be a string in ${configPath}.`,
        );
      }
    }

    // Validate optional exclude is an array of strings if provided.
    if (p["exclude"] !== undefined) {
      if (!Array.isArray(p["exclude"])) {
        throw new Error(
          `Profile "${name}": "exclude" must be an array of strings in ${configPath}.`,
        );
      }
      for (const item of p["exclude"]) {
        if (typeof item !== "string") {
          throw new Error(
            `Profile "${name}": every entry in "exclude" must be a string in ${configPath}.`,
          );
        }
      }
    }

    // Validate optional numeric fields.
    if (p["maxTokens"] !== undefined && typeof p["maxTokens"] !== "number") {
      throw new Error(
        `Profile "${name}": "maxTokens" must be a number in ${configPath}.`,
      );
    }

    // Validate optional boolean fields.
    for (const boolField of ["stripComments", "stripBlankLines"] as const) {
      if (p[boolField] !== undefined && typeof p[boolField] !== "boolean") {
        throw new Error(
          `Profile "${name}": "${boolField}" must be a boolean in ${configPath}.`,
        );
      }
    }

    // Validate optional header.
    if (p["header"] !== undefined && typeof p["header"] !== "string") {
      throw new Error(
        `Profile "${name}": "header" must be a string in ${configPath}.`,
      );
    }
  }

  return raw as CtxPackConfig;
}
