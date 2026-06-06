import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";

// ---------------------------------------------------------------------------
// Config template
// ---------------------------------------------------------------------------

function generateConfig(profiles: ProfileInput[]): string {
  const profileEntries = profiles
    .map((prof) => {
      const fields: string[] = [
        `      include: [${prof.include.map((g) => `"${g}"`).join(", ")}],`,
      ];

      if (prof.maxTokens) {
        fields.push(`      maxTokens: ${String(prof.maxTokens)},`);
      }
      if (prof.stripComments) {
        fields.push(`      stripComments: true,`);
      }
      if (prof.header) {
        fields.push(`      header: "${prof.header}",`);
      }

      return `    ${prof.name}: {\n${fields.join("\n")}\n    },`;
    })
    .join("\n");

  return `import { defineConfig } from "ctx-pack-cli";

export default defineConfig({
  profiles: {
${profileEntries}
  },
  defaults: {
    exclude: ["node_modules/**", "dist/**", ".git/**", "**/*.lock"],
    maxTokens: 10000,
    stripComments: true,
  },
});
`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileInput {
  name: string;
  include: string[];
  maxTokens?: number;
  stripComments?: boolean;
  header?: string;
}

// ---------------------------------------------------------------------------
// Preset profiles
// ---------------------------------------------------------------------------

const PRESETS: Record<string, ProfileInput> = {
  fullstack: {
    name: "app",
    include: ["src/**/*.ts", "src/**/*.tsx"],
    maxTokens: 10000,
    stripComments: true,
    header: "APP SOURCE",
  },
  api: {
    name: "api",
    include: ["src/routes/**", "src/api/**", "src/middleware/**"],
    maxTokens: 8000,
    stripComments: true,
    header: "API ROUTES",
  },
  frontend: {
    name: "ui",
    include: ["src/components/**", "src/pages/**", "src/hooks/**"],
    maxTokens: 8000,
    stripComments: true,
    header: "UI COMPONENTS",
  },
};

// ---------------------------------------------------------------------------
// init command
// ---------------------------------------------------------------------------

export async function runInit(): Promise<void> {
  p.intro(pc.cyan(" ctx-pack init"));

  const configPath = path.join(process.cwd(), "ctx.config.ts");

  // Guard: don't overwrite existing config
  if (fs.existsSync(configPath)) {
    p.log.warn("A ctx.config.ts already exists in this directory.");

    const overwrite = await p.confirm({
      message: "Overwrite it?",
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.outro(pc.dim("Cancelled — existing config left untouched."));
      return;
    }
  }

  // Pick a preset or go custom
  const preset = await p.select({
    message: "Pick a starter profile:",
    options: [
      { value: "fullstack", label: "Full-stack app", hint: "src/**/*.ts, src/**/*.tsx" },
      { value: "api", label: "API / backend", hint: "src/routes/**, src/api/**" },
      { value: "frontend", label: "Frontend / UI", hint: "src/components/**, src/pages/**" },
      { value: "custom", label: "Custom", hint: "I'll type my own globs" },
    ],
  });

  if (p.isCancel(preset)) {
    p.outro(pc.dim("Cancelled."));
    return;
  }

  let profiles: ProfileInput[];

  if (preset === "custom") {
    const name = await p.text({
      message: "Profile name:",
      placeholder: "app",
      validate: (val) => (!val || val.length === 0 ? "Name is required" : undefined),
    });

    if (p.isCancel(name)) {
      p.outro(pc.dim("Cancelled."));
      return;
    }

    const globs = await p.text({
      message: "Include globs (comma-separated):",
      placeholder: "src/**/*.ts, src/**/*.tsx",
      validate: (val) => (!val || val.length === 0 ? "At least one glob is required" : undefined),
    });

    if (p.isCancel(globs)) {
      p.outro(pc.dim("Cancelled."));
      return;
    }

    const tokens = await p.text({
      message: "Max token budget:",
      placeholder: "10000",
      defaultValue: "10000",
      validate: (val) => {
        const n = Number(val);
        if (Number.isNaN(n) || n <= 0) return "Must be a positive number";
        return undefined;
      },
    });

    if (p.isCancel(tokens)) {
      p.outro(pc.dim("Cancelled."));
      return;
    }

    profiles = [
      {
        name: name as string,
        include: (globs as string).split(",").map((s) => s.trim()),
        maxTokens: Number(tokens),
        stripComments: true,
        header: (name as string).toUpperCase() + " CONTEXT",
      },
    ];
  } else {
    const selected = PRESETS[preset as string];
    if (!selected) {
      p.outro(pc.red("Unknown preset."));
      return;
    }
    profiles = [selected];
  }

  // Write the config
  const content = generateConfig(profiles);
  fs.writeFileSync(configPath, content, "utf-8");

  p.log.success(`Created ${pc.green("ctx.config.ts")}`);
  p.log.info(
    `Next: run ${pc.cyan("npx ctx-pack")} to see your profiles, or ${pc.cyan(`npx ctx-pack ${profiles[0]!.name} --dry-run`)} to preview.`,
  );
  p.outro(pc.green("Done!"));
}
