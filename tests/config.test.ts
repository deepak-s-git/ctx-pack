import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defineConfig } from "../dist/config.js";
import type { CtxPackConfig } from "../dist/config.js";

describe("defineConfig", () => {
  it("returns the config object unchanged (identity function)", () => {
    const input: CtxPackConfig = {
      profiles: {
        app: {
          include: ["src/**/*.ts"],
          maxTokens: 5000,
        },
      },
    };

    const result = defineConfig(input);
    assert.deepEqual(result, input);
    assert.equal(result, input, "Should return the same reference");
  });

  it("preserves all profile options", () => {
    const config = defineConfig({
      profiles: {
        test: {
          include: ["lib/**"],
          exclude: ["**/*.spec.ts"],
          maxTokens: 3000,
          stripComments: true,
          stripBlankLines: true,
          header: "TEST HEADER",
        },
      },
      defaults: {
        exclude: ["node_modules/**"],
        maxTokens: 10000,
        stripComments: false,
        stripBlankLines: false,
      },
    });

    const profile = config.profiles["test"]!;
    assert.deepEqual(profile.include, ["lib/**"]);
    assert.deepEqual(profile.exclude, ["**/*.spec.ts"]);
    assert.equal(profile.maxTokens, 3000);
    assert.equal(profile.stripComments, true);
    assert.equal(profile.stripBlankLines, true);
    assert.equal(profile.header, "TEST HEADER");
    assert.equal(config.defaults?.maxTokens, 10000);
  });
});
