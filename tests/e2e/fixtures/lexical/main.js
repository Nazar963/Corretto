// Real Lexical plain-text editor, like WhatsApp Web's message box. Bundled by tests/e2e/global-setup.ts.
// Lexical owns the text in its model and re-renders the DOM from it, so only changes that go
// through its event handlers stick.
import { $getRoot, createEditor } from 'lexical';
import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import { registerPlainText } from '@lexical/plain-text';

const editor = createEditor({
  namespace: 'corretto-fixture',
  onError: (error) => {
    throw error;
  },
});
editor.setRootElement(document.getElementById('lexical'));
registerPlainText(editor);
registerHistory(editor, createEmptyHistoryState(), 300);

/** The editor model's text: what the app would send, not just what the DOM shows. */
window.lexicalText = () => editor.getEditorState().read(() => $getRoot().getTextContent());
