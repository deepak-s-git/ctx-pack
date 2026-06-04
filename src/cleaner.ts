// ---------------------------------------------------------------------------
// Comment stripping
// ---------------------------------------------------------------------------

/**
 * Regex that matches:
 * - Single-line comments:  // ...
 * - Multi-line comments:   /* ... * /
 * - Double-quoted strings: "..."   (preserved)
 * - Single-quoted strings: '...'   (preserved)
 * - Template literals:     `...`   (preserved)
 *
 * Strings are captured so the replacer can leave them untouched, preventing
 * false positives on URLs like `https://example.com` or comment-like
 * content inside string literals.
 */
const COMMENT_RE =
  /(["'`])(?:(?!\1|\\).|\\.)*\1|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

/**
 * Strip single-line (`// …`) and multi-line (`/* … *​/`) comments from
 * source code while preserving string literals.
 *
 * This is a best-effort heuristic — it handles the vast majority of
 * JS/TS/CSS/JSON files but is not a full parser.
 */
export function stripComments(source: string): string {
  return source.replace(COMMENT_RE, (match) => {
    const first = match[0];
    // If the match starts with a quote character it's a string literal — keep it.
    if (first === '"' || first === "'" || first === "`") {
      return match;
    }
    // Otherwise it's a comment — remove it.
    // For single-line comments we return "" (the newline is not part of the match).
    // For multi-line comments that span lines, collapse to a single newline
    // to avoid merging separate lines of code together.
    return match.includes("\n") ? "\n" : "";
  });
}

// ---------------------------------------------------------------------------
// Blank line removal
// ---------------------------------------------------------------------------

/**
 * Collapse runs of 2+ consecutive blank lines into a single blank line.
 * Also trims leading/trailing whitespace from the entire string.
 */
export function stripBlankLines(source: string): string {
  return source.replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// Combined cleaner
// ---------------------------------------------------------------------------

export interface CleanOptions {
  stripComments?: boolean;
  stripBlankLines?: boolean;
}

/**
 * Apply the requested cleaning passes to `source` in the correct order:
 * comments first (may create new blank lines), then blank-line collapsing.
 */
export function clean(source: string, options: CleanOptions): string {
  let result = source;

  if (options.stripComments) {
    result = stripComments(result);
  }
  if (options.stripBlankLines) {
    result = stripBlankLines(result);
  }

  return result;
}
