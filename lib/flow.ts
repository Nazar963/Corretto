// Button click -> background rewrite -> popup -> replacement -> undo toast.

import { captureTarget, type Target } from './edit';
import { errorAction } from './errors';
import { fieldText, isEligibleField, type Field } from './fields';
import type { RewriteResponse } from './messages';
import type { DismissReason, Panel } from './panel';
import type { Strings } from './strings';

export interface FlowOptions {
  panel: Panel;
  strings: Strings;
  request: (text: string, signal: AbortSignal) => Promise<RewriteResponse>;
  openSettings: () => void;
}

export function createRewriteFlow({ panel, strings, request, openSettings }: FlowOptions): (field: HTMLElement) => void {
  // Bumped on every new run or cancel, so late responses from older runs are ignored.
  let generation = 0;
  // Aborting closes the port, which aborts the provider request in the background.
  let inFlight: AbortController | null = null;

  const stop = () => {
    generation++;
    inFlight?.abort();
    inFlight = null;
  };

  const onDismiss = (target: Target) => (reason: DismissReason) => {
    stop();
    // Outside click: the user is going somewhere else, do not pull focus back.
    if (reason === 'escape') target.restoreSelection();
  };

  const showChanged = (field: Field) =>
    panel.showError(field, strings.error_changed, {
      action: { label: strings.retry, run: () => activate(field) },
      onDismiss: () => {},
    });

  const pick = (target: Target, text: string) => {
    panel.close();
    const replacement = target.replace(text);
    const { field } = target;
    if (!replacement) {
      showChanged(field);
      return;
    }
    // Any later edit makes undo unsafe (FR-008 AC-002): close the toast.
    const onEdit = () => {
      if (!replacement.canUndo()) panel.close();
    };
    field.addEventListener('input', onEdit);
    panel.showToast(field, {
      onUndo: () => {
        field.removeEventListener('input', onEdit);
        replacement.undo();
        panel.close();
      },
      onClose: () => field.removeEventListener('input', onEdit),
    });
  };

  const run = async (target: Target) => {
    stop();
    const current = generation;
    const controller = (inFlight = new AbortController());
    panel.showLoading(target.field, {
      onCancel: () => {
        stop();
        panel.close();
        target.restoreSelection();
      },
      onDismiss: onDismiss(target),
    });

    let response: RewriteResponse;
    try {
      response = await request(target.text, controller.signal);
    } catch {
      response = { ok: false, error: { code: 'unknown' } };
    }
    if (current !== generation) return;
    inFlight = null;

    if (!response.ok) {
      const { code } = response.error;
      if (code === 'cancelled') return;
      const action = errorAction(code);
      panel.showError(target.field, strings[`error_${code}`], {
        action:
          action === 'settings'
            ? {
                label: strings.openSettings,
                run: () => {
                  panel.close();
                  openSettings();
                },
              }
            : action === 'retry'
              ? { label: strings.retry, run: () => void run(target) }
              : null,
        onDismiss: onDismiss(target),
      });
      return;
    }
    const { rewrites } = response;
    panel.showResults(target.field, rewrites, {
      onPick: (tone) => pick(target, rewrites[tone]),
      onDismiss: onDismiss(target),
    });
  };

  function activate(field: HTMLElement) {
    if (!isEligibleField(field) || fieldText(field).trim() === '') return;
    void run(captureTarget(field));
  }

  return activate;
}
