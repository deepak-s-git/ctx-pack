import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { stripComments, stripBlankLines, clean } from "../dist/cleaner.js";

// ---------------------------------------------------------------------------
// stripComments
// ---------------------------------------------------------------------------

describe("stripComments", () => {
  it("strips single-line comments", () => {
    const input = 'const x = 1; // this is a comment\nconst y = 2;';
    const result = stripComments(input);
    assert.equal(result, "const x = 1; \nconst y = 2;");
  });

  it("strips multi-line comments", () => {
    const input = "const x = 1;\n/* this is\na multi-line\ncomment */\nconst y = 2;";
    const result = stripComments(input);
    assert.equal(result, "const x = 1;\n\n\nconst y = 2;");
  });

  it("preserves double-quoted strings containing //", () => {
    const input = 'const url = "https://example.com";';
    const result = stripComments(input);
    assert.equal(result, input);
  });

  it("preserves single-quoted strings containing //", () => {
    const input = "const url = 'https://example.com';";
    const result = stripComments(input);
    assert.equal(result, input);
  });

  it("preserves template literals containing //", () => {
    const input = "const url = `https://example.com`;";
    const result = stripComments(input);
    assert.equal(result, input);
  });
});

// ---------------------------------------------------------------------------
// stripBlankLines
// ---------------------------------------------------------------------------

describe("stripBlankLines", () => {
  it("collapses 3+ blank lines into one", () => {
    const input = "a\n\n\n\nb";
    const result = stripBlankLines(input);
    assert.equal(result, "a\n\nb");
  });

  it("leaves single blank lines alone", () => {
    const input = "a\n\nb";
    const result = stripBlankLines(input);
    assert.equal(result, "a\n\nb");
  });

  it("trims leading and trailing whitespace", () => {
    const input = "\n\n  hello  \n\n";
    const result = stripBlankLines(input);
    assert.equal(result, "hello");
  });
});

// ---------------------------------------------------------------------------
// clean (combined)
// ---------------------------------------------------------------------------

describe("clean", () => {
  it("applies both passes when enabled", () => {
    const input = "const x = 1; // comment\n\n\n\nconst y = 2;";
    const result = clean(input, { stripComments: true, stripBlankLines: true });
    assert.equal(result, "const x = 1; \n\nconst y = 2;");
  });

  it("returns source unchanged when both options are false", () => {
    const input = "const x = 1; // comment\n\n\n\n";
    const result = clean(input, { stripComments: false, stripBlankLines: false });
    assert.equal(result, input);
  });
});
