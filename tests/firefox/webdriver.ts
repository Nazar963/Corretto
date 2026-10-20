// Minimal W3C WebDriver client for geckodriver (Playwright cannot load extensions in Firefox).

import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';

const ELEMENT = 'element-6066-11e4-a52e-4f735466cecf';
const SHADOW = 'shadow-6066-11e4-a52e-4f735466cecf';

export type Ref = { [ELEMENT]: string } | { [SHADOW]: string };

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

/** The snap-packaged geckodriver may refuse signals from outside its confinement (EACCES). */
function stop(driver: ChildProcess) {
  try {
    driver.kill();
  } catch {
    // Ending the WebDriver session already closed Firefox; geckodriver exits with this process.
  }
}

export class Firefox {
  private constructor(
    private readonly driver: ChildProcess,
    private readonly base: string,
    private readonly session: string,
  ) {}

  static async start(options: { binary: string; prefs: Record<string, unknown> }): Promise<Firefox> {
    const port = await freePort();
    const driver = spawn('geckodriver', ['--port', String(port)], { stdio: 'ignore' });
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(`${base}/status`);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    const response = await fetch(`${base}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capabilities: {
          alwaysMatch: {
            browserName: 'firefox',
            'moz:firefoxOptions': { binary: options.binary, args: ['-headless'], prefs: options.prefs },
          },
        },
      }),
    });
    const json = (await response.json()) as { value: { sessionId?: string; message?: string } };
    if (!json.value.sessionId) {
      stop(driver);
      throw new Error(`geckodriver: ${json.value.message}`);
    }
    return new Firefox(driver, base, json.value.sessionId);
  }

  async cmd<T = unknown>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.base}/session/${this.session}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json = (await response.json()) as { value: T & { error?: string; message?: string } };
    if (!response.ok) throw new Error(`${method} ${path}: ${json.value.error} ${json.value.message}`);
    return json.value;
  }

  installAddon(path: string) {
    return this.cmd<string>('POST', '/moz/addon/install', { path, temporary: true });
  }

  goto(url: string) {
    return this.cmd('POST', '/url', { url });
  }

  url() {
    return this.cmd<string>('GET', '/url');
  }

  handles() {
    return this.cmd<string[]>('GET', '/window/handles');
  }

  switchTo(handle: string) {
    return this.cmd('POST', '/window', { handle });
  }

  /** Run an async script in the current page; `done` is the last argument. */
  run<T>(script: string, ...args: unknown[]): Promise<T> {
    return this.cmd<T>('POST', '/execute/async', {
      script: `const done = arguments[arguments.length - 1]; (async () => { ${script} })().then(done, (e) => done({ __error: String(e) }));`,
      args,
    });
  }

  find(css: string, root?: Ref): Promise<Ref> {
    const scope = root && SHADOW in root ? `/shadow/${root[SHADOW]}` : '';
    return this.cmd<Ref>('POST', `${scope}/element`, { using: 'css selector', value: css });
  }

  shadowRoot(host: Ref): Promise<Ref> {
    return this.cmd<Ref>('GET', `/element/${(host as Record<string, string>)[ELEMENT]}/shadow`);
  }

  click(element: Ref) {
    return this.cmd('POST', `/element/${(element as Record<string, string>)[ELEMENT]}/click`, {});
  }

  type(element: Ref, text: string) {
    return this.cmd('POST', `/element/${(element as Record<string, string>)[ELEMENT]}/value`, { text });
  }

  /** Press keys on whatever has focus (e.g. "" = Escape). */
  keys(value: string) {
    const actions = [...value].flatMap((key) => [
      { type: 'keyDown', value: key },
      { type: 'keyUp', value: key },
    ]);
    return this.cmd('POST', '/actions', { actions: [{ type: 'key', id: 'kbd', actions }] });
  }

  async quit() {
    await this.cmd('DELETE', '').catch(() => {});
    stop(this.driver);
  }
}

/** Poll until `check` returns a truthy value, or fail with the last value seen. */
export async function waitFor<T>(label: string, check: () => Promise<T>, timeoutMs = 10_000): Promise<T> {
  const end = Date.now() + timeoutMs;
  let last: T | undefined;
  while (Date.now() < end) {
    last = await check().catch(() => undefined as T);
    if (last) return last;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`timed out waiting for ${label}; last value: ${JSON.stringify(last)}`);
}
