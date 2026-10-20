// Local OpenAI-compatible server for e2e tests. Each test gets its own instance on a free port.

import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface Behaviour {
  status: number;
  delayMs: number;
  /** Assistant message content for a given user text. */
  content: (text: string) => string;
  /** Body sent with a non-200 status. */
  errorBody: unknown;
}

export interface RecordedRequest {
  headers: IncomingHttpHeaders;
  body: { model: string; messages: { role: string; content: string }[] };
  /** True if the client closed the connection before the response was sent. */
  aborted: boolean;
}

export const defaultBehaviour = (): Behaviour => ({
  status: 200,
  delayMs: 400,
  content: (text) => JSON.stringify({ minimal: `[minimal] ${text}`, fluent: `[fluent] ${text}`, formal: `[formal] ${text}` }),
  errorBody: {},
});

export interface MockProvider {
  /** Base URL to put in settings, e.g. http://127.0.0.1:1234/v1 */
  baseUrl: string;
  behaviour: Behaviour;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

export async function startMockProvider(): Promise<MockProvider> {
  const provider = { behaviour: defaultBehaviour(), requests: [] as RecordedRequest[] } as MockProvider;
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
        res.writeHead(404).end();
        return;
      }
      const record: RecordedRequest = { headers: req.headers, body: JSON.parse(raw), aborted: false };
      provider.requests.push(record);
      res.on('close', () => {
        if (!res.writableFinished) record.aborted = true;
      });
      const { status, delayMs, content, errorBody } = provider.behaviour;
      const userText = record.body.messages.find((m) => m.role === 'user')?.content ?? '';
      setTimeout(() => {
        if (res.destroyed) return;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status === 200 ? { choices: [{ message: { content: content(userText) } }] } : errorBody));
      }, delayMs);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  provider.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  provider.close = () =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  return provider;
}
