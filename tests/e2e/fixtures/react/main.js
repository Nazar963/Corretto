// Real React controlled textarea for FR-007 AC-001. Bundled by tests/e2e/global-setup.ts.
// Plain JS with createElement so no JSX transform or @types/react is needed.
import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [value, setValue] = useState('');
  const [renders, setRenders] = useState(0);
  return h(
    'div',
    null,
    h('textarea', { id: 'react', rows: 4, cols: 60, value, onChange: (event) => setValue(event.target.value) }),
    h('output', { id: 'state' }, value),
    // Forces a re-render: if React's state missed the change, the DOM value reverts.
    h('button', { id: 'rerender', type: 'button', onClick: () => setRenders(renders + 1) }, `Re-render (${renders})`),
  );
}

createRoot(document.getElementById('root')).render(h(App));
