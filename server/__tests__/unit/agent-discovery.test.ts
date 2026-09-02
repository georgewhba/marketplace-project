import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import agentRoutes from '../../routes/agent.routes.js';

describe('AI Agent Readiness & Discovery Endpoints', () => {
  const app = new Hono();
  app.route('/', agentRoutes);

  it('serves robots.txt with Content-Signal directives', async () => {
    const res = await app.request('/robots.txt');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Content-Signal: ai-train=no, search=yes, ai-input=no');
    expect(text).toContain('GPTBot');
    expect(text).toContain('ClaudeBot');
  });

  it('serves auth.md for agent registration instructions', async () => {
    const res = await app.request('/auth.md');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    const text = await res.text();
    expect(text).toContain('# Agent Authentication Guide');
    expect(text).toContain('oauth-protected-resource');
  });

  it('serves RFC 9728 OAuth Protected Resource Metadata', async () => {
    const res = await app.request('/.well-known/oauth-protected-resource');
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.resource).toBeDefined();
    expect(json.authorization_servers).toBeInstanceOf(Array);
    expect(json.scopes_supported).toContain('customer:read');
  });

  it('serves SEP-1649 MCP Server Card', async () => {
    const res = await app.request('/.well-known/mcp/server-card.json');
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.serverInfo?.name).toBe('marketplace-mcp-server');
    expect(json.capabilities?.tools).toBeInstanceOf(Array);
  });

  it('serves Agent Skills Discovery Index (RFC v0.2.0)', async () => {
    const res = await app.request('/.well-known/agent-skills/index.json');
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.skills).toBeInstanceOf(Array);
    expect(json.skills[0].name).toBe('product-discovery');
  });

  it('serves Web Bot Auth JWKS directory', async () => {
    const res = await app.request('/.well-known/http-message-signatures-directory');
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.keys).toBeInstanceOf(Array);
    expect(json.keys[0].kty).toBe('OKP');
  });

  it('serves ARD ai-catalog.json manifest with CORS', async () => {
    const res = await app.request('/.well-known/ai-catalog.json');
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const json = await res.json() as any;
    expect(json.specVersion).toBe('1.0');
    expect(json.entries).toBeInstanceOf(Array);
  });

  it('serves ACP and UCP commerce metadata', async () => {
    const acpRes = await app.request('/.well-known/acp.json');
    expect(acpRes.status).toBe(200);
    const acpJson = await acpRes.json() as any;
    expect(acpJson.protocol?.name).toBe('acp');

    const ucpRes = await app.request('/.well-known/ucp');
    expect(ucpRes.status).toBe(200);
    const ucpJson = await ucpRes.json() as any;
    expect(ucpJson.services).toBeInstanceOf(Array);
  });

  it('serves openapi.json for MPP payment discovery', async () => {
    const res = await app.request('/openapi.json');
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.openapi).toBe('3.0.0');
    expect(json.paths['/api/orders']?.post?.['x-payment-info']).toBeDefined();
  });
});
