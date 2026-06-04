#!/usr/bin/env node

import { Command } from "commander";
import fs from "node:fs";
import pc from "picocolors";
import { loadConfig } from "./config.js";
import { resolveFiles } from "./resolver.js";
import { formatProfile } from "./formatter.js";
import { printStats, printDryRun } from "./printer.js";

// ---------------------------------------------------------------------------
// CLI setup
// ---------------------------------------------------------------------------

const program = new Command()
  .name("ctx-pack")
  .description(
    "Assemble token-efficient AI context from your codebase using named profiles.",
  )
  .version("0.1.0")
  .argument("[profile]", "Name of the profile to pack")
  .option("-o, --out <file>", "Write output to a file instead of stdout")
  .option("-d, --dry-run", "Show included files + token usage without producing output")
  .option("-s, --stats", "Show per-file token breakdown table")
  .action(async (profileName: string | undefined, opts: CLIOptions) => {
    await run(profileName, opts);
  });

interface CLIOptions {
  out?: string;
  dryRun?: boolean;
  stats?: boolean;
}

// ---------------------------------------------------------------------------
// Main run logic
// ---------------------------------------------------------------------------

async function run(
  profileName: string | undefined,
  opts: CLIOptions,
): Promise<void> {
  // 1. Load config
  const config = await loadConfig();

  const profileNames = Object.keys(config.profiles);

  // 2. If no profile specified, list available profiles
  if (!profileName) {
    console.error(pc.bold(pc.cyan("\n  📦 ctx-pack")));
    console.error(pc.dim("  Available profiles:\n"));
    for (const name of profileNames) {
      const p = config.profiles[name]!;
      const desc = p.header ?? `${p.include.length} include pattern(s)`;
      console.error("  " + pc.green("▸") + " " + pc.bold(name) + pc.dim(` — ${desc}`));
    }
    console.error(
      "\n" + pc.dim("  Run: ") + pc.white("npx ctx-pack <profile>") + pc.dim(" to pack context.\n"),
    );
    return;
  }

  // 3. Validate profile exists
  const profile = config.profiles[profileName];
  if (!profile) {
    console.error(
      pc.red(`\n  ✖ Profile "${profileName}" not found.\n`),
    );
    console.error(pc.dim("  Available profiles: ") + profileNames.join(", ") + "\n");
    process.exitCode = 1;
    return;
  }

  // 4. Resolve files
  const files = await resolveFiles(profile, config);

  if (files.length === 0) {
    console.error(
      pc.yellow(`\n  ⚠ No files matched for profile "${profileName}".\n`),
    );
    console.error(pc.dim("  Include patterns: ") + profile.include.join(", ") + "\n");
    return;
  }

  // 5. Format
  const result = formatProfile(profile, config, files);

  // 6. Output mode
  if (opts.dryRun) {
    printDryRun(result);
    return;
  }

  if (opts.stats) {
    printStats(result);
  }

  if (opts.out) {
    fs.writeFileSync(opts.out, result.output, "utf-8");
    console.error(
      pc.green(`\n  ✔ Written to ${opts.out}`) +
        pc.dim(` (${result.totalTokens.toLocaleString("en-US")} tokens)\n`),
    );
  } else {
    // Write the context to stdout (can be piped to pbcopy, etc.)
    process.stdout.write(result.output + "\n");
  }
}

// ---------------------------------------------------------------------------
// Parse and execute
// ---------------------------------------------------------------------------

program.parseAsync().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(pc.red(`\n  ✖ ${message}\n`));
  process.exitCode = 1;
});
