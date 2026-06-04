import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { countTokens } from "../dist/tokenizer.js";

describe("countTokens", () => {
  it("returns a positive number for non-empty text", () => {
    const tokens = countTokens("Hello, world!");
    assert.ok(tokens > 0, `Expected positive token count, got ${String(tokens)}`);
  });

  it("returns 0 for an empty string", () => {
    const tokens = countTokens("");
    assert.equal(tokens, 0);
  });

  it("returns consistent results across calls (singleton encoder)", () => {
    const a = countTokens("function add(a, b) { return a + b; }");
    const b = countTokens("function add(a, b) { return a + b; }");
    assert.equal(a, b);
  });

  it("longer text produces more tokens", () => {
    const short = countTokens("hello");
    const long = countTokens("hello world, this is a much longer sentence with many more tokens");
    assert.ok(long > short, `Expected ${String(long)} > ${String(short)}`);
  });
});
