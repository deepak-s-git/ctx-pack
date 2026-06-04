import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { resolveFiles } from "../dist/resolver.js";
import type { CtxPackConfig, ProfileConfig } from "../dist/config.js";

// ---------------------------------------------------------------------------
// Test fixture setup — creates a temp directory with known files
// ---------------------------------------------------------------------------

let tmpDir: string;

const fixtureFiles = [
  "src/index.ts",
  "src/utils.ts",
  "src/utils.test.ts",
  "src/deep/nested.ts",
  "dist/index.js",
  "README.md",
];

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-pack-test-"));

  for (const file of fixtureFiles) {
    const fullPath = path.join(tmpDir, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `// ${file}\n`, "utf-8");
  }
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// resolveFiles
// ---------------------------------------------------------------------------

describe("resolveFiles", () => {
  it("resolves matching files from include globs", async () => {
    const profile: ProfileConfig = {
      include: ["src/**/*.ts"],
    };
    const config: CtxPackConfig = { profiles: { test: profile } };

    const files = await resolveFiles(profile, config, tmpDir);
    const relatives = files.map((f) => f.relative);

    assert.ok(relatives.includes("src/index.ts"), "Should include src/index.ts");
    assert.ok(relatives.includes("src/utils.ts"), "Should include src/utils.ts");
    assert.ok(relatives.includes("src/deep/nested.ts"), "Should include nested file");
  });

  it("excludes files matching profile exclude patterns", async () => {
    const profile: ProfileConfig = {
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts"],
    };
    const config: CtxPackConfig = { profiles: { test: profile } };

    const files = await resolveFiles(profile, config, tmpDir);
    const relatives = files.map((f) => f.relative);

    assert.ok(!relatives.includes("src/utils.test.ts"), "Should exclude test files");
    assert.ok(relatives.includes("src/utils.ts"), "Should still include non-test files");
  });

  it("excludes files matching defaults.exclude patterns", async () => {
    const profile: ProfileConfig = {
      include: ["**/*.ts", "**/*.js"],
    };
    const config: CtxPackConfig = {
      profiles: { test: profile },
      defaults: { exclude: ["dist/**"] },
    };

    const files = await resolveFiles(profile, config, tmpDir);
    const relatives = files.map((f) => f.relative);

    assert.ok(!relatives.some((r) => r.startsWith("dist/")), "Should exclude dist/");
  });

  it("always excludes node_modules and .git", async () => {
    // Create a node_modules file in the fixture
    const nmDir = path.join(tmpDir, "node_modules", "pkg");
    fs.mkdirSync(nmDir, { recursive: true });
    fs.writeFileSync(path.join(nmDir, "index.ts"), "// nm\n", "utf-8");

    const profile: ProfileConfig = {
      include: ["**/*.ts"],
    };
    const config: CtxPackConfig = { profiles: { test: profile } };

    const files = await resolveFiles(profile, config, tmpDir);
    const relatives = files.map((f) => f.relative);

    assert.ok(
      !relatives.some((r) => r.includes("node_modules")),
      "Should never include node_modules",
    );

    // Cleanup
    fs.rmSync(path.join(tmpDir, "node_modules"), { recursive: true, force: true });
  });

  it("returns files sorted alphabetically", async () => {
    const profile: ProfileConfig = {
      include: ["src/**/*.ts"],
    };
    const config: CtxPackConfig = { profiles: { test: profile } };

    const files = await resolveFiles(profile, config, tmpDir);
    const relatives = files.map((f) => f.relative);
    const sorted = [...relatives].sort((a, b) => a.localeCompare(b));

    assert.deepEqual(relatives, sorted, "Files should be sorted");
  });

  it("returns empty array when no files match", async () => {
    const profile: ProfileConfig = {
      include: ["nonexistent/**/*.xyz"],
    };
    const config: CtxPackConfig = { profiles: { test: profile } };

    const files = await resolveFiles(profile, config, tmpDir);
    assert.equal(files.length, 0);
  });
});
