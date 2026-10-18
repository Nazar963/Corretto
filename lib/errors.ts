// What the popup offers for each failure (FR-009).

import type { ErrorCode } from './messages';

export type ErrorAction = 'settings' | 'retry' | null;

const ACTIONS: Record<Exclude<ErrorCode, 'cancelled'>, ErrorAction> = {
  not_configured: 'settings',
  no_key: 'settings',
  permission: 'settings',
  invalid_key: 'settings',
  model_not_found: 'settings',
  rate_limited: 'retry',
  timeout: 'retry',
  network: 'retry',
  bad_output: 'retry',
  too_long: null,
  http: 'retry',
  unknown: 'retry',
};

export function errorAction(code: Exclude<ErrorCode, 'cancelled'>): ErrorAction {
  return ACTIONS[code];
}
