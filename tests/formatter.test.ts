import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { formatProfile } from "../dist/formatter.js";
import type { CtxPackConfig, ProfileConfig } from "../dist/config.js";
import type { ResolvedFile } from "../dist/resolver.js";

// ---------------------------------------------------------------------------
// Test fixture — create temp files with known content
// ---------------------------------------------------------------------------

let tmpDir: string;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-pack-fmt-"));

  fs.writeFileSync(path.join(tmpDir, "a.ts"), "const a = 1;\n", "utf-8");
  fs.writeFileSync(path.join(tmpDir, "b.ts"), "const b = 2;\n", "utf-8");
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// formatProfile
// ---------------------------------------------------------------------------

describe("formatProfile", () => {
  it("assembles output with header and file contents", () => {
    const profile: ProfileConfig = {
      include: ["*.ts"],
      header: "TEST CONTEXT",
    };
    const config: CtxPackConfig = { profiles: { test: profile } };
    const files: ResolvedFile[] = [
      { absolute: path.join(tmpDir, "a.ts"), relative: "a.ts" },
    ];

    const result = formatProfile(profile, config, files);

    assert.ok(result.output.includes("=== TEST CONTEXT ==="), "Should have header");
    assert.ok(result.output.includes("--- a.ts ---"), "Should have file header");
    assert.ok(result.output.includes("const a = 1;"), "Should have file contents");
    assert.equal(result.fileCount, 1);
    assert.ok(result.totalTokens > 0);
  });

  it("respects token budget and skips files that exceed it", () => {
    const profile: ProfileConfig = {
      include: ["*.ts"],
      maxTokens: 1, // Extremely small budget
    };
    const config: CtxPackConfig = { profiles: { test: profile } };
    const files: ResolvedFile[] = [
      { absolute: path.join(tmpDir, "a.ts"), relative: "a.ts" },
      { absolute: path.join(tmpDir, "b.ts"), relative: "b.ts" },
    ];

    const result = formatProfile(profile, config, files);

    // With a budget of 1, files with > 1 token should be skipped
    assert.equal(result.fileCount, 0, "No file should fit in a 1-token budget");
  });

  it("uses defaults.maxTokens when profile doesn't set one", () => {
    const profile: ProfileConfig = {
      include: ["*.ts"],
    };
    const config: CtxPackConfig = {
      profiles: { test: profile },
      defaults: { maxTokens: 100000 },
    };
    const files: ResolvedFile[] = [
      { absolute: path.join(tmpDir, "a.ts"), relative: "a.ts" },
    ];

    const result = formatProfile(profile, config, files);

    assert.equal(result.budget, 100000);
    assert.equal(result.fileCount, 1);
  });

  it("defaults header to CONTEXT when unset", () => {
    const profile: ProfileConfig = {
      include: ["*.ts"],
    };
    const config: CtxPackConfig = { profiles: { test: profile } };
    const files: ResolvedFile[] = [
      { absolute: path.join(tmpDir, "a.ts"), relative: "a.ts" },
    ];

    const result = formatProfile(profile, config, files);
    assert.ok(result.output.includes("=== CONTEXT ==="));
  });
});
