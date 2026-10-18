// Deterministic stand-in for an LLM until real adapters land in slice 3.
// Also used by tests: the output is predictable from the input.

import type { Rewrites } from '../messages';

export const MOCK_DELAY_MS = 400;

export async function mockRewrite(text: string, delayMs = MOCK_DELAY_MS): Promise<Rewrites> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return {
    minimal: `[minimal] ${text}`,
    fluent: `[fluent] ${text}`,
    formal: `[formal] ${text}`,
  };
}
