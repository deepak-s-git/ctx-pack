import { getEncoding, type Tiktoken } from "js-tiktoken";

// ---------------------------------------------------------------------------
// Lazy singleton
// ---------------------------------------------------------------------------

/**
 * The tokenizer instance. Initialized on first use because the WASM
 * bootstrap in js-tiktoken costs ~100ms — we don't want to pay that
 * cost for commands that never count tokens (e.g. `--dry-run`).
 */
let encoder: Tiktoken | undefined;

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = getEncoding("cl100k_base");
  }
  return encoder;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Count the number of tokens in `text` using the `cl100k_base` encoding
 * (the same encoding used by GPT-4 / ChatGPT).
 *
 * The underlying tokenizer is initialized lazily on the first call.
 */
export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}
