import { describe, it, expect, afterAll } from 'vitest';
import { buildServer } from './server.js';

describe('API Server', () => {
  it('GET /health returns 200 with status ok', async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();

    await app.close();
  });

  it('POST /graphql responds to introspection query', async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'content-type': 'application/json' },
      payload: {
        query: '{ __schema { queryType { name } } }',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.__schema.queryType.name).toBe('Query');

    await app.close();
  });

  it('POST /graphql health query returns ok', async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'content-type': 'application/json' },
      payload: {
        query: '{ health }',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.health).toBe('ok');

    await app.close();
  });

  it('POST /graphql serverInfo returns status and version', async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'content-type': 'application/json' },
      payload: {
        query: '{ serverInfo { status timestamp version } }',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.serverInfo.status).toBe('ok');
    expect(body.data.serverInfo.version).toBe('0.1.0');

    await app.close();
  });
});
