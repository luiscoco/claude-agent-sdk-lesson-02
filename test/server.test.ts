import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiHandler } from '../src/server/app.js';
async function host() {
  const api = createApiHandler({ liveAvailable: false });
  const server = createServer((req, res) => {
    void api(req, res)
      .then((ok) => {
        if (!ok) {
          res.writeHead(404);
          res.end();
        }
      })
      .catch(() => {
        res.writeHead(500);
        res.end();
      });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
const req = (data: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(data),
});
test('HTTP workshop runs a real tool without a model key', async () => {
  const app = await host();
  try {
    const metadata = (await (await fetch(app.url + '/api/meta')).json()) as {
      liveAvailable: boolean;
      exports: unknown[];
    };
    assert.equal(metadata.liveAvailable, false);
    assert.equal(metadata.exports.length, 9);
    const r = await fetch(app.url + '/api/invoke', req({ arguments: { lessonId: 2 } }));
    assert.equal(r.status, 200);
    const result = (await r.json()) as { ok: boolean; handlerCalls: number };
    assert.equal(result.ok, true);
    assert.equal(result.handlerCalls, 1);
  } finally {
    await app.close();
  }
});
test('a tool validation error is separate from a host request error', async () => {
  const app = await host();
  try {
    const r = await fetch(app.url + '/api/invoke', req({ arguments: { lessonId: '2' } }));
    assert.equal(r.status, 200);
    const result = (await r.json()) as { ok: boolean; handlerCalls: number };
    assert.equal(result.ok, false);
    assert.equal(result.handlerCalls, 0);
    assert.equal((await fetch(app.url + '/api/invoke', req({ arguments: [] }))).status, 400);
  } finally {
    await app.close();
  }
});
test('malformed JSON, oversized bodies, unknown endpoints and cross-origin calls fail clearly', async () => {
  const app = await host();
  try {
    assert.equal((await fetch(app.url + '/api/invoke', { ...req({}), body: '{' })).status, 400);
    assert.equal(
      (await fetch(app.url + '/api/invoke', req({ arguments: { x: 'a'.repeat(9000) } }))).status,
      400,
    );
    assert.equal((await fetch(app.url + '/api/unknown')).status, 404);
    assert.equal(
      (
        await fetch(
          app.url + '/api/invoke',
          req({ arguments: { lessonId: 2 } }, { Origin: 'https://other.example' }),
        )
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});
test('live mode does not substitute a fake answer when no key is configured', async () => {
  const app = await host();
  try {
    const r = await fetch(app.url + '/api/live', req({ prompt: 'Look up Lesson 2' }));
    assert.equal(r.status, 409);
    assert.match(await r.text(), /ANTHROPIC_API_KEY/);
  } finally {
    await app.close();
  }
});
test('source inspection returns only the intended public tool-definition file', async () => {
  const app = await host();
  try {
    const r = (await (await fetch(app.url + '/api/source')).json()) as {
      filename: string;
      content: string;
    };
    assert.equal(r.filename, 'src/server/course-tool.ts');
    assert.match(r.content, /createSdkMcpServer/);
    assert.match(r.content, /z.number/);
  } finally {
    await app.close();
  }
});
test('settings API returns selected mode fields rather than raw settings', async () => {
  const app = await host();
  try {
    const r = await fetch(app.url + '/api/settings', req({}));
    assert.equal(r.status, 200);
    const data = (await r.json()) as Record<string, unknown>;
    assert.equal(data.projectFixtureLoaded, true);
    assert.equal('effective' in data, false);
    assert.equal('env' in data, false);
  } finally {
    await app.close();
  }
});
