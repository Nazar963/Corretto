// Content script / extension pages <-> background contract (docs/adr/0002-llm-calls-in-background.md).

import type { Settings } from './settings';

/** The three fixed tones (FR-005, docs/adr/0004-output-contract.md). */
export interface Rewrites {
  minimal: string;
  fluent: string;
  formal: string;
}

export const TONES = ['minimal', 'fluent', 'formal'] as const satisfies readonly (keyof Rewrites)[];
export type Tone = (typeof TONES)[number];

/** Failure reasons shown to the user (FR-009). */
export const ERROR_CODES = [
  'not_configured',
  'no_key',
  'permission',
  'invalid_key',
  'model_not_found',
  'rate_limited',
  'timeout',
  'network',
  'bad_output',
  'too_long',
  'http',
  'cancelled',
  'unknown',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface RewriteError {
  code: ErrorCode;
  /** The provider's own explanation, if it sent one (shortened, key redacted). */
  detail?: string;
}

export type RewriteResponse = { ok: true; rewrites: Rewrites } | { ok: false; error: RewriteError };

/**
 * Rewrites run over a port so closing it cancels the provider request.
 * The content script posts one RewriteRequest and receives one RewriteResponse.
 */
export const REWRITE_PORT = 'corretto/rewrite';

export interface RewriteRequest {
  type: 'corretto/rewrite';
  text: string;
}

/** From the options page: run a short rewrite with unsaved settings. */
export interface TestConnectionRequest {
  type: 'corretto/test-connection';
  settings: Settings;
}

/** From the content script: content scripts cannot call openOptionsPage themselves. */
export interface OpenSettingsRequest {
  type: 'corretto/open-settings';
}

function hasType(message: unknown, type: string): boolean {
  return typeof message === 'object' && message !== null && (message as { type?: unknown }).type === type;
}

export function isRewriteRequest(message: unknown): message is RewriteRequest {
  return hasType(message, 'corretto/rewrite') && typeof (message as RewriteRequest).text === 'string';
}

export function isTestConnectionRequest(message: unknown): message is TestConnectionRequest {
  return hasType(message, 'corretto/test-connection') && typeof (message as TestConnectionRequest).settings === 'object';
}

export function isOpenSettingsRequest(message: unknown): message is OpenSettingsRequest {
  return hasType(message, 'corretto/open-settings');
}
