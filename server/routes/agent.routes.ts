import { Hono } from 'hono';
import { db } from '../db/index.js';
import { products, categories, vendors } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { getRequestBaseUrl } from '../middleware/httpsRedirect.js';

const agentRoutes = new Hono();

// Helper to get the base URL dynamically (with SSL & reverse proxy support)
const getBaseUrl = (c: any) => getRequestBaseUrl(c);

// 1. robots.txt with Content Signals
agentRoutes.get('/robots.txt', (c) => {
  const baseUrl = getBaseUrl(c);
  const robots = `User-agent: *
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/
Disallow: /api/admin/
Disallow: /api/payments/
Disallow: /api/refunds/

# Content Signals (AI Training & Input Preferences)
Content-Signal: ai-train=no, search=yes, ai-input=no

# AI Agents specific rules
User-agent: GPTBot
Allow: /api/store/
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/

User-agent: ClaudeBot
Allow: /api/store/
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/

User-agent: Google-Extended
Allow: /api/store/
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/

User-agent: PerplexityBot
Allow: /api/store/
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/

Sitemap: ${baseUrl}/sitemap.xml
`;
  return c.text(robots);
});

// 2. sitemap.xml
agentRoutes.get('/sitemap.xml', async (c) => {
  const baseUrl = getBaseUrl(c);
  
  const allProducts = await db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.isActive, true));
  const allCategories = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true));
  const allVendors = await db.select({ slug: vendors.storeSlug }).from(vendors).where(eq(vendors.status, 'approved'));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  allCategories.forEach(cat => {
    xml += `
  <url>
    <loc>${baseUrl}/api/store/categories/${cat.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  allVendors.forEach(vendor => {
    xml += `
  <url>
    <loc>${baseUrl}/api/store/vendors/${vendor.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  allProducts.forEach(prod => {
    const lastMod = prod.updatedAt ? new Date(prod.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    xml += `
  <url>
    <loc>${baseUrl}/api/store/products/${prod.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
  });

  xml += `\n</urlset>`;
  
  return c.text(xml, 200, { 'Content-Type': 'application/xml' });
});

// 3. llms.txt
agentRoutes.get('/llms.txt', (c) => {
  const baseUrl = getBaseUrl(c);
  const text = `# Marketplace Agent Guide

This is a multi-vendor ecommerce marketplace. AI agents are welcome to discover products, read reviews, and explore vendor storefronts.

## Machine-Readable Resources
- **API Catalog (OpenAPI):** ${baseUrl}/api/catalog
- **OpenAPI Standard:** ${baseUrl}/openapi.json
- **ARD Manifest (AI Catalog):** ${baseUrl}/.well-known/ai-catalog.json
- **MCP Server Card:** ${baseUrl}/.well-known/mcp/server-card.json
- **Agent Skills Discovery:** ${baseUrl}/.well-known/agent-skills/index.json
- **Auth for Agents:** ${baseUrl}/auth.md
- **OAuth Protected Resource:** ${baseUrl}/.well-known/oauth-protected-resource
- **ACP Commerce Metadata:** ${baseUrl}/.well-known/acp.json
- **UCP Commerce Profile:** ${baseUrl}/.well-known/ucp
- **Sitemap:** ${baseUrl}/sitemap.xml

## Content Negotiation
All public \`/api/store/*\` and frontend root routes support Markdown content negotiation.
Include \`Accept: text/markdown\` in your request headers to receive agent-optimized, clean markdown representations of products, categories, and vendors, complete with Schema.org JSON-LD structured data.

## Authentication
For endpoints requiring authentication (e.g. cart, orders), see:
- ${baseUrl}/auth.md
- ${baseUrl}/.well-known/oauth-authorization-server
- ${baseUrl}/.well-known/oauth-protected-resource
`;
  return c.text(text, 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
});

// 4. auth.md & /.well-known/auth.md (Agent Registration & Authentication Guide)
const handleAuthMd = (c: any) => {
  const baseUrl = getBaseUrl(c);
  const authDoc = `# Agent Authentication Guide (auth.md)

Welcome to the Marketplace Agent Authentication System. This document outlines how autonomous agents, personal assistants, and bots authenticate and interact with protected marketplace resources.

## 1. Supported Authentication Methods
- **Bearer JWT Tokens:** Standard OAuth 2.0 / Bearer tokens issued at \`${baseUrl}/api/auth/login\` or \`${baseUrl}/api/auth/refresh\`.
- **Delegated Customer Sessions:** Agents operating on behalf of a human user can pass the user's \`accessToken\` in the \`Authorization: Bearer <token>\` header.
- **Agent Registration:** Agents can register programmatic accounts at \`${baseUrl}/api/auth/register\` with \`role: "customer"\`.

## 2. OAuth Discovery Endpoints
- **Protected Resource Metadata (RFC 9728):** \`${baseUrl}/.well-known/oauth-protected-resource\`
- **Authorization Server Metadata:** \`${baseUrl}/.well-known/oauth-authorization-server\`

## 3. Scopes Supported
- \`customer:read\`: Read user profile and shipping addresses
- \`customer:write\`: Update profile or add addresses
- \`cart:read\`: Read active shopping cart
- \`cart:write\`: Add or remove items from shopping cart
- \`orders:read\`: View order history and fulfillment tracking
- \`orders:write\`: Initiate order checkout (Requires human confirmation)

## 4. Revocation & Token Rotation
Tokens can be rotated at \`${baseUrl}/api/auth/refresh\` and revoked at \`${baseUrl}/api/auth/logout\`.
`;
  return c.text(authDoc, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'x-markdown-tokens': '280'
  });
};
agentRoutes.get('/auth.md', handleAuthMd);
agentRoutes.get('/.well-known/auth.md', handleAuthMd);

// 5. OAuth Protected Resource Metadata (RFC 9728)
agentRoutes.get('/.well-known/oauth-protected-resource', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    resource: baseUrl,
    authorization_servers: [baseUrl],
    scopes_supported: [
      "customer:read",
      "customer:write",
      "cart:read",
      "cart:write",
      "orders:read",
      "orders:write"
    ],
    bearer_methods_supported: ["header", "cookie"],
    resource_documentation: `${baseUrl}/auth.md`
  });
});

// 6. OAuth Authorization Server Metadata (RFC 8414) with agent_auth block
agentRoutes.get('/.well-known/oauth-authorization-server', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/login`,
    token_endpoint: `${baseUrl}/api/auth/refresh`,
    scopes_supported: ["customer:read", "customer:write", "cart:read", "cart:write", "orders:read", "orders:write"],
    response_types_supported: ["token"],
    grant_types_supported: ["password", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    agent_auth: {
      register_uri: `${baseUrl}/api/auth/register`,
      supported_identity_types: ["ephemeral_agent", "delegated_user"],
      credential_types: ["bearer_jwt"],
      revocation_uri: `${baseUrl}/api/auth/logout`
    }
  });
});

// 7. MCP Server Card (SEP-1649)
const handleMcpServerCard = (c: any) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    $schema: "https://modelcontextprotocol.io/schema/server-card.json",
    serverInfo: {
      name: "marketplace-mcp-server",
      version: "1.0.0",
      description: "Multi-vendor ecommerce marketplace MCP server for autonomous product discovery and checkout assistance."
    },
    transport: {
      type: "sse",
      endpoint: `${baseUrl}/api/chat`
    },
    capabilities: {
      tools: [
        {
          name: "search_products",
          description: "Search the product catalog by keyword, price, or category.",
          inputSchema: {
            type: "object",
            properties: {
              search: { type: "string", description: "Search keyword" },
              category: { type: "string", description: "Category slug" },
              minPrice: { type: "number" },
              maxPrice: { type: "number" }
            }
          }
        },
        {
          name: "get_product",
          description: "Retrieve complete details, specifications, and reviews of a specific product by slug.",
          inputSchema: {
            type: "object",
            properties: {
              slug: { type: "string", description: "Product slug identifier" }
            },
            required: ["slug"]
          }
        }
      ],
      resources: [
        {
          uri: `${baseUrl}/api/store/categories`,
          name: "Categories",
          description: "List of all product categories available in the marketplace."
        }
      ]
    }
  });
};
agentRoutes.get('/.well-known/mcp/server-card.json', handleMcpServerCard);
agentRoutes.get('/.well-known/mcp-server.json', handleMcpServerCard);
agentRoutes.get('/.well-known/mcp.json', handleMcpServerCard);

// 8. Agent Skills Discovery Index (RFC v0.2.0)
agentRoutes.get('/.well-known/agent-skills/index.json', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    $schema: "https://agentskills.io/schema/v0.2.0/index.json",
    skills: [
      {
        name: "product-discovery",
        type: "search",
        description: "Search and filter products across multiple verified vendors with real-time stock and pricing.",
        url: `${baseUrl}/.well-known/agent-skills/product-discovery/SKILL.md`,
        digest: "sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
      },
      {
        name: "order-tracking",
        type: "commerce",
        description: "Assist authenticated customers in tracking shipments, order items, and delivery statuses.",
        url: `${baseUrl}/.well-known/agent-skills/order-tracking/SKILL.md`,
        digest: "sha256:7b293d054bc1b11b98c5208f029a8a7de4d291991d7c4391cf8e9c0fa4841d13"
      }
    ]
  });
});

agentRoutes.get('/.well-known/agent-skills/product-discovery/SKILL.md', (c) => {
  return c.text(`# Product Discovery Skill

## Overview
Allows autonomous AI agents to browse, search, and retrieve products from the marketplace.

## Endpoints
- GET /api/store/products?search={term}&category={slug}&limit=10
- GET /api/store/products/{slug}
- GET /api/store/categories
`, 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
});

agentRoutes.get('/.well-known/agent-skills/order-tracking/SKILL.md', (c) => {
  return c.text(`# Order Tracking Skill

## Overview
Allows authorized AI agents with user credentials to check order statuses.

## Endpoints
- GET /api/orders (Requires Bearer token)
- GET /api/orders/{id} (Requires Bearer token)
`, 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
});

// 9. Web Bot Auth Directory (JWKS)
agentRoutes.get('/.well-known/http-message-signatures-directory', (c) => {
  return c.json({
    keys: [
      {
        kty: "OKP",
        crv: "Ed25519",
        x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo",
        kid: "marketplace-bot-2026",
        use: "sig",
        alg: "EdDSA"
      }
    ]
  });
});

// 10. ARD (Agentic Resource Discovery) Manifest & api-catalog
const handleAiCatalog = (c: any) => {
  const baseUrl = getBaseUrl(c);
  c.header('Access-Control-Allow-Origin', '*');
  return c.json({
    specVersion: "1.0",
    host: {
      name: "Marketplace Egypt",
      domain: new URL(baseUrl).host,
      description: "AI Agent Enabled Multi-Vendor Ecommerce Platform"
    },
    entries: [
      {
        id: `urn:air:${new URL(baseUrl).hostname}:mcp:server-card`,
        displayName: "Marketplace MCP Server",
        type: "application/vnd.mcp+json",
        url: `${baseUrl}/.well-known/mcp/server-card.json`,
        representativeQueries: [
          "Find products by category or price",
          "Search electronic gadgets",
          "Check product details and seller reviews"
        ]
      },
      {
        id: `urn:air:${new URL(baseUrl).hostname}:openapi:catalog`,
        displayName: "Marketplace OpenAPI Catalog",
        type: "application/vnd.oai.openapi+json",
        url: `${baseUrl}/api/catalog`,
        representativeQueries: [
          "List store products",
          "Fetch category endpoints"
        ]
      },
      {
        id: `urn:air:${new URL(baseUrl).hostname}:skills:discovery-index`,
        displayName: "Agent Skills Discovery Index",
        type: "application/json",
        url: `${baseUrl}/.well-known/agent-skills/index.json`,
        representativeQueries: [
          "Discover shopping skills for agents",
          "Order tracking skill"
        ]
      }
    ]
  });
};
agentRoutes.get('/.well-known/ai-catalog.json', handleAiCatalog);
agentRoutes.get('/.well-known/api-catalog', handleAiCatalog);

// 11. ACP (Agentic Commerce Protocol) Discovery
agentRoutes.get('/.well-known/acp.json', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    protocol: {
      name: "acp",
      version: "1.0"
    },
    api_base_url: `${baseUrl}/api`,
    transports: ["https", "sse"],
    capabilities: {
      services: [
        "catalog_search",
        "cart_management",
        "checkout_flow",
        "order_tracking"
      ]
    }
  });
});

// 12. UCP (Universal Commerce Protocol)
agentRoutes.get('/.well-known/ucp', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    version: "1.0",
    services: [
      {
        id: "urn:ucp:service:catalog",
        endpoint: `${baseUrl}/api/store/products`,
        capabilities: ["search", "filter", "detail"]
      },
      {
        id: "urn:ucp:service:cart",
        endpoint: `${baseUrl}/api/cart`,
        capabilities: ["add", "view", "remove"]
      },
      {
        id: "urn:ucp:service:orders",
        endpoint: `${baseUrl}/api/orders`,
        capabilities: ["checkout", "status"]
      }
    ],
    schemas: [
      `${baseUrl}/api/catalog`,
      `${baseUrl}/openapi.json`
    ]
  });
});

// 13. x402 Payment Protocol Discovery
agentRoutes.get('/.well-known/x402.json', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    protocol: "x402",
    version: "1.0",
    facilitatorUrl: "https://pay.x402.org",
    endpoints: {
      checkout: `${baseUrl}/api/payments/paymob/initiate`
    }
  });
});

// 14. AI Plugin config
agentRoutes.get('/.well-known/ai-plugin.json', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    schema_version: "v1",
    name_for_human: "Marketplace Search",
    name_for_model: "marketplace_search",
    description_for_human: "Search for products and browse the marketplace catalog.",
    description_for_model: "Help the user search for products, view vendor stores, and read reviews on the marketplace. Use the OpenAPI spec to understand available endpoints.",
    auth: {
      type: "none"
    },
    api: {
      type: "openapi",
      url: `${baseUrl}/api/catalog`,
      is_user_authenticated: false
    },
    logo_url: `${baseUrl}/favicon.svg`,
    contact_email: "support@marketplace.com",
    legal_info_url: `${baseUrl}/terms`
  });
});

// 15. Standard OpenAPI document (Both /api/catalog and /openapi.json for MPP)
const handleOpenApi = (c: any) => {
  const baseUrl = getBaseUrl(c);
  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "Marketplace Agent & Payment API",
      description: "Machine-readable API for discovering products, categories, and payment intents.",
      version: "1.0.0"
    },
    servers: [
      { url: baseUrl }
    ],
    paths: {
      "/api/store/products": {
        get: {
          summary: "List Products",
          operationId: "listProducts",
          parameters: [
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "vendor", in: "query", schema: { type: "string" } },
            { name: "minPrice", in: "query", schema: { type: "number" } },
            { name: "maxPrice", in: "query", schema: { type: "number" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
          ],
          responses: {
            "200": {
              description: "A list of products.",
              content: {
                "application/json": { schema: { type: "object" } },
                "text/markdown": { schema: { type: "string" } }
              }
            }
          }
        }
      },
      "/api/store/products/{slug}": {
        get: {
          summary: "Get Product Details",
          operationId: "getProduct",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            "200": {
              description: "Product details including vendor and reviews.",
              content: {
                "application/json": { schema: { type: "object" } },
                "text/markdown": { schema: { type: "string" } }
              }
            }
          }
        }
      },
      "/api/orders": {
        post: {
          summary: "Create Order",
          operationId: "createOrder",
          "x-payment-info": {
            intent: "charge",
            method: ["card", "wallet", "cod"],
            currency: "EGP"
          },
          responses: {
            "201": { description: "Order created" }
          }
        }
      }
    }
  };
  return c.json(openApiSpec);
};

agentRoutes.get('/api/catalog', handleOpenApi);
agentRoutes.get('/openapi.json', handleOpenApi);

export default agentRoutes;
