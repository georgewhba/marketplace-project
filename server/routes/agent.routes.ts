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
  return new Response(robots, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
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
  
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
});

// 3. llms.txt
agentRoutes.get('/llms.txt', (c) => {
  const baseUrl = getBaseUrl(c);
  const text = `# Marketplace Agent Guide

This is a multi-vendor ecommerce marketplace. AI agents are welcome to discover products, read reviews, and explore vendor storefronts.

## Machine-Readable Resources
- **API Catalog (RFC 9727):** ${baseUrl}/.well-known/api-catalog
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
  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'x-markdown-tokens': '260'
    }
  });
});

// 4. auth.md & /.well-known/auth.md (WorkOS auth.md spec with agent_auth YAML frontmatter)
const handleAuthMd = (c: any) => {
  const baseUrl = getBaseUrl(c);
  const authDoc = `# Auth.md

You are an agent. This service supports **agentic registration**: discover → register → (claim if needed) → exchange for an access_token → call API → handle revocation. Follow the steps in order; do not skip ahead.

## Agent Auth Metadata
\`\`\`yaml
agent_auth:
  skill: "${baseUrl}/auth.md"
  register_uri: "${baseUrl}/api/auth/register"
  authorization_server: "${baseUrl}/.well-known/oauth-authorization-server"
  protected_resource: "${baseUrl}/.well-known/oauth-protected-resource"
  identity_types_supported:
    - "anonymous"
    - "identity_assertion"
  anonymous:
    credential_types_supported: ["bearer_jwt"]
    claim_uri: "${baseUrl}/api/auth/me"
  identity_assertion:
    assertion_types_supported: ["verified_email", "urn:ietf:params:oauth:token-type:id-jag"]
    credential_types_supported: ["bearer_jwt"]
  claim_uri: "${baseUrl}/api/auth/me"
  revocation_uri: "${baseUrl}/api/auth/logout"
\`\`\`

# auth.md — Marketplace Agent Registration

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
  return new Response(authDoc, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'x-markdown-tokens': '310'
    }
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
    resource_documentation: `${baseUrl}/auth.md`,
    agent_auth: {
      skill: "https://isitagentready.com/.well-known/agent-skills/auth-md/SKILL.md",
      register_uri: `${baseUrl}/api/auth/register`,
      identity_types_supported: ["anonymous", "identity_assertion"],
      anonymous: {
        credential_types_supported: ["bearer_jwt"],
        claim_uri: `${baseUrl}/api/auth/me`
      },
      identity_assertion: {
        assertion_types_supported: ["verified_email", "urn:ietf:params:oauth:token-type:id-jag"],
        credential_types_supported: ["bearer_jwt"]
      },
      credential_types: ["bearer_jwt"],
      revocation_uri: `${baseUrl}/api/auth/logout`
    }
  });
});

// 6. OAuth Authorization Server Metadata (RFC 8414) with agent_auth block
agentRoutes.get('/.well-known/oauth-authorization-server', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/login`,
    token_endpoint: `${baseUrl}/api/auth/refresh`,
    registration_endpoint: `${baseUrl}/api/auth/register`,
    revocation_endpoint: `${baseUrl}/api/auth/logout`,
    scopes_supported: ["customer:read", "customer:write", "cart:read", "cart:write", "orders:read", "orders:write"],
    response_types_supported: ["token"],
    grant_types_supported: ["password", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    agent_auth: {
      skill: "https://isitagentready.com/.well-known/agent-skills/auth-md/SKILL.md",
      register_uri: `${baseUrl}/api/auth/register`,
      identity_types_supported: ["anonymous", "identity_assertion"],
      supported_identity_types: ["anonymous", "ephemeral_agent", "delegated_user"],
      credential_types: ["bearer_jwt"],
      credential_types_supported: ["bearer_jwt"],
      anonymous: {
        credential_types_supported: ["bearer_jwt"],
        claim_uri: `${baseUrl}/api/auth/me`
      },
      identity_assertion: {
        assertion_types_supported: ["verified_email", "urn:ietf:params:oauth:token-type:id-jag"],
        credential_types_supported: ["bearer_jwt"]
      },
      claim_uri: `${baseUrl}/api/auth/me`,
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
  return new Response(`# Product Discovery Skill

## Overview
Allows autonomous AI agents to browse, search, and retrieve products from the marketplace.

## Endpoints
- GET /api/store/products?search={term}&category={slug}&limit=10
- GET /api/store/products/{slug}
- GET /api/store/categories
`, {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
});

agentRoutes.get('/.well-known/agent-skills/order-tracking/SKILL.md', (c) => {
  return new Response(`# Order Tracking Skill

## Overview
Allows authorized AI agents with user credentials to check order statuses.

## Endpoints
- GET /api/orders (Requires Bearer token)
- GET /api/orders/{id} (Requires Bearer token)
`, {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
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

// 10. ARD (Agentic Resource Discovery) Manifest
agentRoutes.get('/.well-known/ai-catalog.json', (c) => {
  const baseUrl = getBaseUrl(c);
  const hostname = new URL(baseUrl).hostname;
  c.header('Access-Control-Allow-Origin', '*');
  return c.json({
    specVersion: "1.0",
    host: {
      name: "Marketplace Egypt",
      domain: hostname,
      description: "AI Agent Enabled Multi-Vendor Ecommerce Platform"
    },
    entries: [
      {
        identifier: `urn:air:${hostname}:mcp:server-card`,
        id: `urn:air:${hostname}:mcp:server-card`,
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
        identifier: `urn:air:${hostname}:openapi:catalog`,
        id: `urn:air:${hostname}:openapi:catalog`,
        displayName: "Marketplace OpenAPI Catalog",
        type: "application/vnd.oai.openapi+json",
        url: `${baseUrl}/api/catalog`,
        representativeQueries: [
          "List store products",
          "Fetch category endpoints"
        ]
      },
      {
        identifier: `urn:air:${hostname}:skills:discovery-index`,
        id: `urn:air:${hostname}:skills:discovery-index`,
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
});

// 11. RFC 9727 & RFC 9264 API Catalog (application/linkset+json)
agentRoutes.get('/.well-known/api-catalog', (c) => {
  const baseUrl = getBaseUrl(c);
  const linksetData = {
    linkset: [
      {
        anchor: `${baseUrl}/api`,
        "service-desc": [
          {
            href: `${baseUrl}/api/catalog`,
            type: "application/vnd.oai.openapi+json"
          },
          {
            href: `${baseUrl}/openapi.json`,
            type: "application/json"
          }
        ],
        "service-doc": [
          {
            href: `${baseUrl}/llms.txt`,
            type: "text/markdown"
          },
          {
            href: `${baseUrl}/auth.md`,
            type: "text/markdown"
          }
        ],
        status: [
          {
            href: `${baseUrl}/api/health`,
            type: "application/json"
          }
        ]
      }
    ]
  };

  return new Response(JSON.stringify(linksetData), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
});

// 12. ACP (Agentic Commerce Protocol) Discovery
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

// 13. UCP (Universal Commerce Protocol) - contains required 'ucp' field
agentRoutes.get('/.well-known/ucp', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    ucp: {
      version: "1.0",
      capabilities: ["catalog", "cart", "checkout", "orders"],
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
      endpoints: {
        catalog: `${baseUrl}/api/store/products`,
        cart: `${baseUrl}/api/cart`,
        checkout: `${baseUrl}/api/orders`
      }
    },
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

// 14. x402 Payment Protocol Discovery
const handleX402 = (c: any) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    x402: {
      version: "1.0",
      facilitator: "https://pay.x402.org",
      wallet: "0x71C86DF4E7eC21DaeAFA78df3D4b6E19E7b461f9",
      network: "base",
      currency: "USDC",
      schemes: ["exact", "upto"]
    },
    endpoints: {
      checkout: `${baseUrl}/api/payments/initiate`,
      pay: `${baseUrl}/api/payments/initiate`
    }
  });
};
agentRoutes.get('/.well-known/x402', handleX402);
agentRoutes.get('/.well-known/x402.json', handleX402);

// 15. AI Plugin config
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

// 16. Standard OpenAPI document (Both /api/catalog and /openapi.json for MPP)
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
            method: "card",
            methods: ["card", "stripe", "tempo", "lightning", "wallet", "cod"],
            amount: 100,
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
