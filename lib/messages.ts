// Content script <-> background contract (docs/adr/0002-llm-calls-in-background.md).

/** The three fixed tones (FR-005, docs/adr/0004-output-contract.md). */
export interface Rewrites {
  minimal: string;
  fluent: string;
  formal: string;
}

export const TONES = ['minimal', 'fluent', 'formal'] as const satisfies readonly (keyof Rewrites)[];
export type Tone = (typeof TONES)[number];

export interface RewriteRequest {
  type: 'corretto/rewrite';
  text: string;
}

export type RewriteResponse = { ok: true; rewrites: Rewrites } | { ok: false; error: { code: string } };

export function isRewriteRequest(message: unknown): message is RewriteRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as RewriteRequest).type === 'corretto/rewrite' &&
    typeof (message as RewriteRequest).text === 'string'
  );
}
