# ctx-pack

> Assemble token-efficient AI context from your codebase using named profiles.

Stop manually copying files into ChatGPT / Claude / Gemini. Define named context profiles in a `ctx.config.ts`, then run one command to get a clean, token-counted output ready to paste or pipe.

## Install

```bash
npm install -D ctx-pack
```

Or run directly with npx — no install required:

```bash
npx ctx-pack
```

## Quick Start

**1. Create a `ctx.config.ts` in your project root:**

```ts
import { defineConfig } from "ctx-pack";

export default defineConfig({
  profiles: {
    auth: {
      include: ["src/features/auth/**", "src/lib/session.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      maxTokens: 8000,
      stripComments: true,
      stripBlankLines: true,
      header: "AUTH FEATURE CONTEXT",
    },
    api: {
      include: ["src/routes/**", "src/middleware/**"],
      maxTokens: 12000,
    },
    db: {
      include: ["src/db/**", "prisma/schema.prisma"],
      maxTokens: 6000,
    },
  },
  defaults: {
    exclude: ["node_modules/**", "dist/**", ".git/**", "**/*.lock"],
    maxTokens: 10000,
    stripComments: true,
  },
});
```

**2. Run it:**

```bash
npx ctx-pack auth          # output to stdout
npx ctx-pack auth | pbcopy # copy to clipboard (macOS)
npx ctx-pack auth --out ctx.txt  # write to file
```

## Commands

| Command | Description |
|---|---|
| `npx ctx-pack` | List available profiles |
| `npx ctx-pack <profile>` | Output profile context to stdout |
| `npx ctx-pack <profile> --out <file>` | Write to a file |
| `npx ctx-pack <profile> --dry-run` | Show included files + token count, no output |
| `npx ctx-pack <profile> --stats` | Per-file token breakdown table |

## Stats Mode

The `--stats` flag renders a beautiful per-file token breakdown — perfect for optimizing your context budget:

```
  📊 Token Breakdown
────────────────────────────────────────────────────────
  File              Tokens       %  Distribution
────────────────────────────────────────────────────────
  src/cleaner.ts       221    5.6%  █░░░░░░░░░░░░░░░░░░░
  src/cli.ts           769   19.5%  ████░░░░░░░░░░░░░░░░
  src/config.ts      1,069   27.2%  █████░░░░░░░░░░░░░░░
  src/formatter.ts     528   13.4%  ███░░░░░░░░░░░░░░░░░
  src/index.ts          26    0.7%  ░░░░░░░░░░░░░░░░░░░░
  src/printer.ts       874   22.2%  ████░░░░░░░░░░░░░░░░
  src/resolver.ts      374    9.5%  ██░░░░░░░░░░░░░░░░░░
  src/tokenizer.ts      76    1.9%  ░░░░░░░░░░░░░░░░░░░░
────────────────────────────────────────────────────────
  8 files            3,937    100%  3,937 / 8,000 tokens
```

## Output Format

```
=== AUTH FEATURE CONTEXT ===
[Token budget: 8,000 | Files: 7 | Used: 4,231 tokens]

--- src/features/auth/index.ts ---
<file contents>

--- src/features/auth/session.ts ---
<file contents>
```

## Profile Options

| Option | Type | Default | Description |
|---|---|---|---|
| `include` | `string[]` | **(required)** | Glob patterns for files to include |
| `exclude` | `string[]` | `[]` | Glob patterns for files to exclude |
| `maxTokens` | `number` | `defaults.maxTokens` | Maximum token budget |
| `stripComments` | `boolean` | `false` | Remove comments from source |
| `stripBlankLines` | `boolean` | `false` | Collapse consecutive blank lines |
| `header` | `string` | `"CONTEXT"` | Header text in the output block |

## How It Works

1. **Config loading** — Your `ctx.config.ts` is loaded at runtime via [jiti](https://github.com/unjs/jiti) (no compilation step needed)
2. **File resolution** — Globs are resolved via [fast-glob](https://github.com/mrmlnc/fast-glob) with merged exclude patterns
3. **Cleaning** — Comments and blank lines are optionally stripped
4. **Tokenization** — Token counts use [js-tiktoken](https://github.com/dqbd/tiktoken) with the `cl100k_base` encoding (same as GPT-4)
5. **Budget enforcement** — Files are added in order until the token budget is reached
6. **Output** — Clean, structured text to stdout (or a file)

## Requirements

- Node.js ≥ 18
- TypeScript config files work out of the box — no `ts-node` needed

## License

MIT
